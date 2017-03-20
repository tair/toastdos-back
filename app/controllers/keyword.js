'use strict';

const Keyword = require('../models/keyword');

const response = require('../lib/responses');

const KEYWORD_SUBSTRING_MIN_LENGTH = 3;
const KEYWORD_SEARCH_LIMIT = 20;
const KEYWORD_SUBSTRING_REGEX = /^[\w ]+$/;

/**
 * Returns a list of keywords that match the given string.
 * @param  {Express.Request}   req  - the request object
 * @param  {Express.Response}  res  - the response object
 * @param  {Function} next - pass to next route handler
 */
function partialKeywordMatch(req, res, next) {
	if (!req.body.substring) {
		return response.badRequest(res, `'substring' is a required field`);
	}

	if (!req.body.keyword_type) {
		return response.badRequest(res, `'keyword_type' is a required field`);
	}

	if (req.body.substring.length < KEYWORD_SUBSTRING_MIN_LENGTH) {
		return response.badRequest(res, 'Keyword search string too short');
	}

	if (!req.body.substring.match(KEYWORD_SUBSTRING_REGEX)) {
		return response.badRequest(res, `Invalid Keyword search string ${req.body.substring}`);
	}

	Keyword
		.query(qb => {
			qb.where('name', 'LIKE', `%${req.body.substring}%`);
			qb.where('keyword_type_id', '=', req.body.keyword_type);
			qb.offset(0).limit(KEYWORD_SEARCH_LIMIT);
		})
		.fetchAll()
		.then(results => {
			return response.ok(res, results.toJSON());
		})
		.catch(err => {
			return response.defaultServerError(res, err);
		});
}


module.exports = {
	partialKeywordMatch
};
