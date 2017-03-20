'use strict';

const Keyword = require('../models/keyword');

const response = require('../lib/responses');

const KEYWORD_SUBSTRING_MIN_LENGTH = 3;
const KEYWORD_SEARCH_LIMIT = 20;
const KEYWORD_SUBSTRING_REGEX = /^[\w ]+$/;

/**
 * Returns a list of keywords that match the given string.
 *
 * Query Params:
 * substring - (Required) Keyword name substring to search for.
 * keyword_type - (Optional) Keyword type to constrain search to.
 *
 * Responses:
 * 200 with search results
 * 400 for invalid substring or keyword_type
 */
function partialKeywordMatch(req, res, next) {
	if (!req.query.substring) {
		return response.badRequest(res, `'substring' is a required field`);
	}

	if (req.query.substring.length < KEYWORD_SUBSTRING_MIN_LENGTH) {
		return response.badRequest(res, 'Keyword search string too short');
	}

	if (!req.query.substring.match(KEYWORD_SUBSTRING_REGEX)) {
		return response.badRequest(res, `Invalid Keyword search string ${req.query.substring}`);
	}

	Keyword
		.query(qb => {
			if (req.query.keyword_type) {
				qb.where('keyword_type_id', '=', req.query.keyword_type);
			}
			qb.where('name', 'LIKE', `%${req.query.substring}%`);
			qb.offset(0).limit(KEYWORD_SEARCH_LIMIT);
		})
		.fetchAll()
		.then(results => response.ok(res, results))
		.catch(err => response.defaultServerError(res, err));
}


module.exports = {
	partialKeywordMatch
};
