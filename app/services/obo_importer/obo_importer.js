'use strict';

/**
 * Gene Ontology Data Importer Service
 * Parses a plain text gene ontology (.obo) file into the database.
 *
 * NOTE: Only currently handles initial import. Don't try to update (yet).
 */

const stream     = require('stream');
const fs         = require('fs');
const LineStream = require('byline').LineStream;
const _          = require('lodash');

const OboParser               = require('../../lib/obo_parser').OboParser;
const unixDiff                = require('../diff_tool/unix_diff');
const DeletedOboTermExtractor = require('../diff_tool/diff_obo').DeletedOboTermExtractor;

const logger = require('../logger');

const bookshelf          = require('../../lib/bookshelf');
const Keyword            = require('../../models/keyword');
const KeywordType        = require('../../models/keyword_type');
const Synonym            = require('../../models/synonym');
const GeneTermAnnotation = require('../../models/gene_term_annotation');
const GeneGeneAnnotation = require('../../models/gene_gene_annotation');


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

		// Catch empty objects from a newline at the end of the OBO
		if (_.isEmpty(term)) {
			return next();
		}

		// Parse is_obsolete into a proper true or false
		term.is_obsolete = (term.is_obsolete === 'true');

		// Use default KeywordType if no KeywordType is specified
		let keywordTypePromise;
		if (term.namespace) {
			keywordTypePromise = this._addKeywordType(term.namespace);
		} else {
			keywordTypePromise = this._addKeywordType(this.defaultKeywordTypeName);
		}

		return keywordTypePromise
			.then(keywordType => this._addKeyword(term.name, term.id, keywordType.get('id'), term.is_obsolete))
			.then(keyword => this._addSynonyms(term.synonym, keyword.get('id')))
			.then(() => next())
			.catch(err => {
				logger.debug(err);
				next();
			});
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
			// Sometimes this line can be null, so just resolve
			if (!oboNameLines) {
				return Promise.resolve(null);
			}

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
 * Takes in a parsed obo term and handles the process
 * of deleting that term from the system.
 * See processDeletedTerms for details.
 */
class DeletedTermHandler extends stream.Writable {
	_write(chunk, enc, next) {
		let term = JSON.parse(chunk.toString());

		bookshelf.transaction(transaction => {
			// Keyword to be deleted
			let oldKeywordProm = Keyword.getByExtId(term.id, transaction);

			// Synonym whose parent Keyword will be used to replace deleted Keyword
			let mergeSynonymProm = Synonym
				.where('name', term.name)
				.fetch({
					withRelated: 'keyword',
					transacting: transaction
				});

			// Used for collection.save methods called below
			let updateParams = {
				method: 'update',
				require: false,
				patch: true,
				transacting: transaction
			};

			return Promise.all([oldKeywordProm, mergeSynonymProm])
				.then(([oldKeyword, mergeSynonym]) => {

					// Skip Keywords we can't find in our system.
					if (!oldKeyword) {
						throw new Error('Skip');
					}

					// We need a Keyword to merge into
					if (!mergeSynonym || !mergeSynonym.related('keyword')) {
						throw new Error('NoMergeFound');
					}

					// Point all Annotations referencing the deleted Keyword to the merge Keyword.
					// Do operations one-by-one to avoid race conditions with GeneTermAnnotations.
					// Carry this hash of Keyword IDs through each promise in this chain.
					return Promise.resolve({
						old: oldKeyword.get('id'),
						merge: mergeSynonym.related('keyword').get('id')
					});
				})
				.then(keywordIDs => {
					// Update method_id on GeneTermAnnotations
					let gtMethodProm = GeneTermAnnotation
						.query(qb => qb.where('method_id', keywordIDs.old))
						.save({method_id: keywordIDs.merge}, updateParams);

					return Promise.all([Promise.resolve(keywordIDs), gtMethodProm]);
				})
				.then(([keywordIDs, ignore_res]) => {
					// Update keyword_id on GeneTermAnnotations
					let gtKeywordProm = GeneTermAnnotation
						.query(qb => qb.where('keyword_id', keywordIDs.old))
						.save({keyword_id: keywordIDs.merge}, updateParams);

					return Promise.all([Promise.resolve(keywordIDs), gtKeywordProm]);
				})
				.then(([keywordIDs, ignore_res]) => {
					// Update method_id on GeneGeneAnnotations
					let ggMethodProm = GeneGeneAnnotation
						.query(qb => qb.where('method_id', keywordIDs.old))
						.save({method_id: keywordIDs.merge}, updateParams);

					return Promise.all([Promise.resolve(keywordIDs), ggMethodProm]);
				})
				.then(([keywordIDs, ignore_res]) => {
					// Delete removed Synonyms
					let synProm = Synonym
						.where('keyword_id', keywordIDs.old)
						.destroy({transacting: transaction});

					return Promise.all([Promise.resolve(keywordIDs), synProm]);
				})
				.then(([keywordIDs, ignore_res]) => {
					// Delete removed Keyword
					return Keyword
						.where('id', keywordIDs.old)
						.destroy({transacting: transaction});
				});
		})
		.then(() => next()) // Transaction commits automatically
		.catch(err => {
			// Transaction rolls back automatically on error

			// Log errors, but move onto next term
			if (err.message === 'Skip') {
				logger.warn(`Tried to delete Keyword with ID "${term.id}", but could not find it in our system.`);
			} else if (err.message === 'NoMergeFound') {
				logger.error('Found no keyword to merge into when deleting term: %j', term);
			} else {
				logger.error(err);
			}

			next();
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

/**
 * Handles terms that have been deleted in the given obo file.
 * By default, a cached version of the given obo file is used.
 * This can be overridden.
 * ex: /given/path/file.obo
 *     /given/path/cache/file.obo
 *
 * A deleted term's (Term A) name is *supposed* to be added to
 * another term's (Term B) synonym list in the new obo file.
 * Update all annotations that reference Term A to reference
 * Term B instead. Finally, Term A is deleted from our system.
 *
 * @param newOboPath - path of the .obo file
 * @param oldOboPath - optional. Overrides use of cached .obo for the diff
 * @returns {Promise.<TResult>}
 */
function processDeletedTerms(newOboPath, oldOboPath) {
	let cachedPath = oldOboPath;

	// Use cached obo if no old obo is specified
	if (!oldOboPath) {
		// Separate filename from filepath
		let splitPath = newOboPath.split('/');
		let filename = splitPath.pop();
		let filePath = splitPath.join('/');

		cachedPath = `${filePath}/cache/${filename}`;
	}

	// Make sure our obo files actually exist
	if (!fs.existsSync(newOboPath)) {
		return Promise.reject(new Error(`File "${newOboPath}" does not exist`));
	}
	if (!fs.existsSync(cachedPath)) {
		return Promise.reject(new Error(`File "${cachedPath}" does not exist`));
	}

	// Set up the processing pipeline
	return new Promise((resolve, reject) => {
		unixDiff.unixDiff(cachedPath, newOboPath)
			.pipe(new DeletedOboTermExtractor())
			.pipe(new OboParser())
			.pipe(new DeletedTermHandler())
			.on('finish', data => resolve(data))
			.on('error', err => reject(err));
	});
}

module.exports = {
	loadOboIntoDB,
	processDeletedTerms
};
