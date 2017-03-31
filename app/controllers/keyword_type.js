'use strict';

const KeywordType = require('../models/keyword_type');

const response = require('../lib/responses');

/**
 * Get all KeywordTypes in the database
 * @param  {Express.Request}   req  - the request object
 * @param  {Express.Response}  res  - the response object
 * @param  {Function} next - pass to next route handler
 */
function getKeywordTypes(req, res, next) {

    return KeywordType
	    .fetchAll()
	    .then(keywordtypes => {
	    	return response.ok(res, keywordtypes);
	    })
	    .catch(err => {
	    	return response.defaultServerError(res, err);
    });
}


module.exports = {
	getKeywordTypes
};
