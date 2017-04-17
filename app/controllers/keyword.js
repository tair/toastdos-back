'use strict';

const Keyword     = require('../models/keyword');
const KeywordType = require('../models/keyword_type');

const response = require('../lib/responses');

const KEYWORD_SUBSTRING_MIN_LENGTH = 3;
const KEYWORD_SEARCH_LIMIT = 20;

/**
 * Returns a list of keywords that match the given string.
 *
 * Query Params:
 * substring - (Required) Keyword name substring to search for.
 * keyword_scope - (Optional) Keyword type to constrain search to.
 *
 * Responses:
 * 200 with search results
 * 400 for invalid substring or keyword_scope
 */
function partialKeywordMatch(req, res, next) {
	if (!req.query.substring) {
		return response.badRequest(res, `'substring' is a required field`);
	}

	if (req.query.substring.length < KEYWORD_SUBSTRING_MIN_LENGTH) {
		return response.badRequest(res, 'Keyword search string too short');
	}

	// Verify / retrieve the provided KeywordType
	let keywordTypePromise;
	if (req.query.keyword_scope) {
		keywordTypePromise = KeywordType.where({name: req.query.keyword_scope}).fetch({require: true});
	} else {
		keywordTypePromise = Promise.resolve(null);
	}

	keywordTypePromise
		.then(keywordType => {
			return Keyword.query(qb => {
				if (keywordType) {
					qb.where('keyword_type_id', '=', keywordType.get('id'));
				}
				qb.where('name', 'LIKE', `%${req.query.substring}%`);
				qb.whereNot('is_obsolete', 1);
				qb.offset(0).limit(KEYWORD_SEARCH_LIMIT);
			})
			.fetchAll();
		})
		.then(results => response.ok(res, results))
		.catch(err => {
			// This error happens if we can't find a KeywordType matching the provided scope
			if (err.message.includes('EmptyResponse')) {
				return response.badRequest(res, `Invalid keyword_scope ${req.query.keyword_scope}`);
			}

			response.defaultServerError(res, err)
		});
}


module.exports = {
	partialKeywordMatch
};
