"use strict";

/**
 * Gene Ontology Data Importer Service
 * Parses a plain text gene ontology (.obo) file into the database.
 *
 * NOTE: Only currently handles initial import. Don't try to update (yet).
 */

const stream    = require('stream');
const fs        = require('fs');
const path      = require('path');
const obo       = require('bionode-obo');
const Bookshelf = require('../lib/bookshelf');

const Keyword     = require('../models/keyword');
const KeywordType = require('../models/keyword_type');
const Synonym     = require('../models/synonym');


/** Our custom WritableStream lets us control the rate we read the obo file at. */
class DBStream extends stream.Writable {
	_write(chunk, enc, next) {
		let term = JSON.parse(chunk);
		processTerm(term).then(() => next());
	}
}

/* Cache all KeywordTypes to speed up adding Keywords.
 *
 * There are very few KeywordTypes compared to the number of Keywords.
 * We're talking like, 4 types for 47,000 terms. We therefore cache
 * the KeywordTypes because we'll get a cache hit *far* more often than not.
 */
let keywordTypeCache = {};

/**
 * Adds each term in the obo file into the DB.
 *
 * @param filepath - path of the .obo file to read in
 * @returns {Promise.<TResult>}
 */
function parseOboFileIntoDb(filepath) {
	return loadKeywordTypeCache()
		.then(() => new Promise((resolve, reject) => {
			fs.createReadStream(path.join(filepath))
				.pipe(obo.parse(processHeader))
				.pipe(new DBStream())
				.on('error', e => {
					console.error(e);
					reject();
				})
				.on('finish', () => {
					Bookshelf.knex.destroy();
					resolve();
				});
		}));
}

/**
 * Obo headers can specify a default KeywordType for when individual
 * terms do not specify their own KeywordType. This stores that
 * default KeywordType.
 *
 * @param headerData - JSON string of header data
 */
function processHeader(headerData) {


}

/**
 * Processes a single obo "term", adding any new Keywords,
 * KeywordTypes, or Synonyms to the Database.
 *
 * @param term - JSON object of ontology term from obo parser
 * @returns {Promise.<null>}
 */
function processTerm(term) {
	process.stdout.write('.'); // Number of periods printed corresponds to number of records processed.
	return addKeywordType(term.namespace)
		.then(keywordType => addKeyword(term.name, term.id, keywordType.get('id')))
		.then(keyword => addSynonyms(term.synonym, keyword.get('id')));
}

/**
 * Load pre-existing KeywordTypes into the cache
 * @returns {*|Promise.<TResult>}
 */
function loadKeywordTypeCache() {
	return KeywordType.fetchAll().then(keywordTypes => {
		return new Promise(resolve => {
			keywordTypes.forEach(keywordType => {
				keywordTypeCache[keywordType.get('name')] = keywordType;
			});
			resolve();
		});
	});
}

/**
 * Adds a new KeywordType. If the KeywordType already exists,
 * returns the cached version in a promise.
 *
 * @param name - Plain text name of KeywordType
 * @returns {Promise.<KeywordType>}
 */
function addKeywordType(name) {
	if (keywordTypeCache[name]) {
		return Promise.resolve(keywordTypeCache[name]);
	} else {
		return new Promise(resolve => {
			KeywordType.forge({name: name})
				.save()
				.then(keywordType => {
					keywordTypeCache[keywordType.get('name')] = keywordType;
					resolve(keywordType);
				});
		});
	}
}

/**
 * Adds a new Keyword, or returns an existing keyword
 * with a matching externalId.
 *
 * @param name - Plain text name
 * @param externalId - ID from external DB
 * @param keywordTypeId - Foreign key ID for KeywordType
 * @returns {Promise.<Keyword>}
 */
function addKeyword(name, externalId, keywordTypeId) {
	return Keyword.where({external_id: externalId}).fetch().then(keyword => {
		if (keyword) {
			return Promise.resolve(keyword);
		} else {
			return Keyword.forge({
				name: name,
				external_id: externalId,
				keyword_type_id: keywordTypeId
			}).save();
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
function addSynonyms(synonymField, keywordId) {
	// Synonym comes in as an array if there's more than one
	if (synonymField instanceof Array) {
		return Promise.all(
			synonymField.map(synonymLine => addSynonym(synonymLine, keywordId))
		);
	} else if (synonymField) {
		return addSynonym(synonymField, keywordId);
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
function addSynonym(synonymString, keywordId) {
	let name = synonymString.split('"')[1];
	return Synonym.where({keyword_id: keywordId, name: name}).fetch().then(synonym => {
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

module.exports.parseOboFileIntoDb = parseOboFileIntoDb;
