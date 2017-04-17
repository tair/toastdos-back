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
						});
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
	 * Handles the 3 different scenarios for the synonym field of an
	 * obo term, adding the Synonym(s) to the DB if they exist.
	 *
	 * @param synonymField - obo string for this synonym
	 * @param keywordId - Foreign key ID of Keyword this Synonym applies to
	 * @returns {Promise.<Synonym>|Promise.<[Synonym]>}
	 */
	_addSynonyms(synonymField, keywordId) {
		// Synonym comes in as an array if there's more than one
		if (synonymField instanceof Array) {
			return Promise.all(
				synonymField.map(synonymLine => this._addSynonym(synonymLine, keywordId))
			);
		} else if (synonymField) {
			return this._addSynonym(synonymField, keywordId);
		} else {
			// Return empty promise to keep return type consistent
			return Promise.resolve(null);
		}
	}

	/**
	 * Parses the Synonym name out of the obo synonym line format,
	 * then adds it to the DB as a new Synonym.
	 *
	 * @param synonymString - obo Synonym line
	 * @param keywordId - Foreign key ID of Keyword this Synonym applies to
	 * @returns {Promise.<Synonym>}
	 */
	_addSynonym(synonymString, keywordId) {
		let name = synonymString.split('"')[1];

		// PostgreSQL has an issue with names longer than 255 characters
		if (name.length > 255) {
			name = name.substring(0, 252) + '...';
		}

		return Synonym.where({keyword_id: keywordId, name: name})
			.fetch()
			.then(synonym => {
				if (synonym) {
					return Promise.resolve(synonym);
				} else {
					return Synonym.forge({
						name: name,
						keyword_id: keywordId
					}).save();
				}
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
