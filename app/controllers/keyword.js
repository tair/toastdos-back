'use strict';

const Keyword = require('../models/keyword');

const KEYWORD_SUBSTRING_MIN_LENGTH = 5;
const KEYWORD_SEARCH_LIMIT = 20;
const KEYWORD_SUBSTRING_REGEX = /^[\w ]+$/;

/**
 * Returns a list of keywords that match the given string.
 * @param  {Express.Request}   req  - the request object
 * @param  {Express.Response}  res  - the response object
 * @param  {Function} next - pass to next route handler
 */
function partialKeywordMatch(req, res, next) {
	if (req.body.substring.length < KEYWORD_SUBSTRING_MIN_LENGTH) {
		return res.status(400).send('Keyword search string too short');
	}

	if (!req.body.substring.match(KEYWORD_SUBSTRING_REGEX)) {
		return res.status(400).send(`Invalid Keyword search string ${req.body.substring}`);
	}

	Keyword
		.query(qb => {
			qb.where('name', 'LIKE', `%${req.body.substring}%`);
			qb.where('keyword_type_id', '=', req.body.keyword_type);
			qb.offset(0).limit(KEYWORD_SEARCH_LIMIT);
		})
		.fetchAll()
		.then(results => {
			return res.status(200).json(results.toJSON());
		})
		.catch(err => {
			return res.status(500).send('Unknown Error');
		});
}


module.exports = {
	partialKeywordMatch
};
