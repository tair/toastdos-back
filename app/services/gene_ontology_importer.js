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
		processTerm(term).then(res => {
			next();
		});
	}
}


/** Adds each term in the obo file into the DB */
// The GO obo file we're using has 45783 terms
// TODO pass this file name in and fully qualify it
fs.createReadStream(path.join(__dirname, '../../../go.obo'))
	.pipe(obo.parse(processHeader))
	.pipe(new DBStream())
	.on('error', e => console.error(e))
	.on('finish', () => Bookshelf.knex.destroy());


/* Cache all KeywordTypes to speed up adding Keywords.
 *
 * There are very few KeywordTypes compared to the number of Keywords.
 * We're talking like, 4 types for 47,000 terms. We therefore cache
 * the KeywordTypes because we'll get a cache hit *far* more often than not.
 */
let keywordTypeCache = {};

/**
 * Processes a single obo "term", adding any new Keywords,
 * KeywordTypes, or Synonyms to the Database.
 *
 * @param term - JSON object of ontology term from obo parser
 * @returns {Promise.<null>}
 */
function processTerm(term) {
	process.stdout.write('.'); // Number of periods printed corresponds to number of records processed.
	return addKeywordWithType(term)
		.then(addedKeyword => addSynonyms(term.synonym, addedKeyword.get('id')));
}

/**
 * Adds the Keyword portion of the term. Attempts to find the KeywordType
 * in the cache, and adds it as a new type if not found.
 *
 * @param term - JSON object of ontology term from obo parser
 * @returns {Promise.<Keyword>}
 */
function addKeywordWithType(term) {
	// KeywordType Cache hit
	if (keywordTypeCache[term.namespace]) {
		let keywordType = keywordTypeCache[term.namespace];
		return addKeyword(term.name, term.id, keywordType.get('id'));
	} else {
		// Add the keyword to the cache if we haven't seen it yet
		return addKeywordType(term.namespace).then(addedKeywordType => {
			keywordTypeCache[term.namespace] = addedKeywordType;
			return addKeyword(term.name, term.id, addedKeywordType.get('id'));
		});
	}
}

/**
 * Adds a new KeywordType.
 *
 * @param name - Plain text name
 * @returns {Promise.<KeywordType>}
 */
function addKeywordType(name) {
	return KeywordType
		.forge({name: name})
		.save();
}

/**
 * Adds a new Keyword.
 *
 * @param name - Plain text name
 * @param externalId - ID from external DB
 * @param keywordTypeId - Foreign key ID for KeywordType
 * @returns {Promise.<Keyword>}
 */
function addKeyword(name, externalId, keywordTypeId) {
	return Keyword
		.forge({
			name: name,
			external_id: externalId,
			keyword_type_id: keywordTypeId
		})
		.save();
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
	return Synonym
		.forge({
			name: synonymString.split('"')[1],
			keyword_id: keywordId
		})
		.save();
}

/**
 * We don't currently do anything with the obo header info,
 * but if we ever needed to, this is where we'd do it.
 *
 * @param headerData - JSON string of header data
 */
function processHeader(headerData) { }
