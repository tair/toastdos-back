'use strict';

/**
 * Gene Ontology Data Importer Service
 * Parses a plain text gene ontology (.obo) file into the database.
 *
 * NOTE: Only currently handles initial import. Don't try to update (yet).
 */

const stream     = require('stream');
const fs         = require('fs');
const OboParser  = require('../../lib/obo_parser').OboParser;
const LineStream = require('byline').LineStream;
const _          = require('lodash');

const Keyword     = require('../../models/keyword');
const KeywordType = require('../../models/keyword_type');
const Synonym     = require('../../models/synonym');


/**
 * Custom Writable stream that consumes all of the parsed obo terms
 */
class DataImporter extends stream.Writable {

	constructor(options) {
		super(options);
		this.defaultKeywordTypeName = null;
		this.keywordTypeCache = {};
	}

	/**
	 * Cache all KeywordTypes to speed up adding Keywords.
	 *
	 * There are very few KeywordTypes compared to the number of Keywords.
	 * We're talking like, 4 types for 47,000 terms. We therefore cache
	 * the KeywordTypes because we'll get a cache hit *far* more often than not.
	 *
	 * @returns {*|Promise.<TResult>}
	 */
	loadKeywordTypeCache() {
		return KeywordType.fetchAll().then(keywordTypes => {
			return new Promise(resolve => {
				keywordTypes.forEach(keywordType => {
					this.keywordTypeCache[keywordType.get('name')] = keywordType;
				});
				resolve();
			});
		});
	}

	/**
	 * Process the obo header. Some terms omit the 'namespace' field,
	 * in which case the term's namespace comes from the default in the header.
	 */
	processHeader(headerJson) {
		let header = JSON.parse(headerJson);
		this.defaultKeywordTypeName = header['default-namespace'];
	}

	/**
	 * Processes a single obo "term", adding any new Keywords,
	 * KeywordTypes, or Synonyms to the Database.
	 *
	 * This function is called for each chunk the stream processes.
	 *
	 * @param term - JSON object of ontology term from obo parser
	 * @returns {Promise.<null>}
	 */
	_write(chunk, enc, next) {
		let term = JSON.parse(chunk.toString());

		// Parse is_obsolete into a proper true or false
		term.is_obsolete = (term.is_obsolete === 'true');

		// Use default KeywordType if no KeywordType is specified
		let keywordTypePromise;
		if (term.namespace) {
			keywordTypePromise = this._addKeywordType(term.namespace);
		} else {
			keywordTypePromise = this._addKeywordType(this.defaultKeywordTypeName);
		}

		keywordTypePromise
			.then(keywordType => this._addKeyword(term.name, term.id, keywordType.get('id'), term.is_obsolete))
			.then(keyword => this._addSynonyms(term.synonym, keyword.get('id')))
			.then(() => next());
	}

	/**
	 * Adds a new KeywordType. If the KeywordType already exists,
	 * returns the cached version in a promise.
	 *
	 * @param name - Plain text name of KeywordType
	 * @returns {Promise.<KeywordType>}
	 */
	_addKeywordType(name) {
		if (this.keywordTypeCache[name]) {
			return Promise.resolve(this.keywordTypeCache[name]);
		} else {
			return new Promise(resolve => {
				KeywordType.forge({name: name})
					.save()
					.then(keywordType => {
						this.keywordTypeCache[keywordType.get('name')] = keywordType;
						resolve(keywordType);
					});
			});
		}
	}

	/**
	 * Adds a new Keyword or updates an existing Keyword.
	 * If a user added Keyword appears in an OBO file, the external
	 * ID of the OBO term will be added to the existing Keyword.
	 *
	 * @param name - Plain text name
	 * @param externalId - ID from external DB
	 * @param keywordTypeId - Foreign key ID for KeywordType
	 * @param isObsolete - Whether or not this keyword is obsolete
	 * @returns {Promise.<Keyword>} Created or existing keyword
	 */
	_addKeyword(name, externalId, keywordTypeId, isObsolete) {
		// If this Keyword was already added from an OBO file, just update it
		return Keyword.where('external_id', externalId).fetch().then(keyword => {
			if (keyword) {
				return keyword.set({
					name: name,
					is_obsolete: isObsolete
				}).save();
			}
			else {
				// A user may have previously added a keyword that now appears in an OBO file
				return Keyword.where('name', name).fetch().then(keyword => {
					if (keyword) {
						return keyword.set({
							external_id: externalId,
							is_obsolete: isObsolete
						}).save();
					}
					else {
						// If none of the above, add the whole new keyword
						return Keyword.forge({
							name: name,
							external_id: externalId,
							keyword_type_id: keywordTypeId,
							is_obsolete: isObsolete
						}).save();
					}
				});
			}
		});
	}

	/**
	 * Adds new synonyms present in the OBO file, and deletes
	 * those that are not in the OBO file.
	 *
	 * @param oboNameLines - Synonym name line (or array of lines) from obo file
	 * @param keywordId - Foreign key ID of Keyword this Synonym applies to
	 * @returns {Promise.<Synonym>|Promise.<[Synonym]>}
	 */
	_addSynonyms(oboNameLines, keywordId) {
		return Synonym.where('keyword_id', keywordId).fetchAll().then(synonyms => {
			let existing = synonyms.map(synonym => synonym.get('name'));

			// Ensure we always have an array of obo synonym lines
			if (!(oboNameLines instanceof Array)) {
				oboNameLines = [oboNameLines];
			}

			// Process incoming synonym name strings
			let provided = oboNameLines.map(oboLine => {
				// Pull 'synonym name' out of 'synonym: "synonym name" RELATED [GOC:mah]'
				let name = oboLine.split('"')[1];

				// PostgreSQL has an issue with names longer than 255 characters
				if (name.length > 255) {
					name = name.substring(0, 252) + '...';
				}

				return name;
			});

			let staleSynonyms = _.difference(existing, provided);
			let newSynonyms = _.difference(provided, existing).map(name => ({name: name, keyword_id: keywordId}));

			return Promise.all([
				Synonym.where('name', 'IN', staleSynonyms).destroy(),
				Synonym.addAll(newSynonyms)
			]);
		});
	}

}

/**
 * Adds each term in the obo file into the DB.
 *
 * @param filepath - path of the .obo file to read in
 * @returns {Promise.<TResult>}
 */
function loadOboIntoDB(filepath) {
	return new Promise((resolve, reject) => {
		let dataImporter = new DataImporter();

		// Sets 'this' in the header callback to the DataImporter instead of the OboParser
		let boundHeaderParser = dataImporter.processHeader.bind(dataImporter);

		let oboParser = new OboParser(boundHeaderParser);
		let lineStream = new LineStream({keepEmptyLines: true});

		dataImporter.loadKeywordTypeCache().then(() => {
			fs.createReadStream(filepath)
				.pipe(lineStream)
				.pipe(oboParser)
				.pipe(dataImporter)
				.on('finish', () => resolve())
				.on('error', err => reject(err));
		});
	});
}

module.exports.loadOboIntoDB = loadOboIntoDB;
