"use strict";

const Keyword = require('../models/keyword');

/**
 * Returns a list of keywords that match the given string.
 * @param  {Express.Request}   req  - the request object
 * @param  {Express.Response}  res  - the response object
 * @param  {Function} next - pass to next route handler
 */
function partialKeywordMatch(req, res, next) {
	res.status(500).send('unimplemented');
}


module.exports = {
	partialKeywordMatch
};
