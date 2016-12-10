"use strict";

const KeywordType = require('../models/keyword_type');

/**
 * Get all KeywordTypes in the database
 * @param  {Express.Request}   req  - the request object
 * @param  {Express.Response}  res  - the response object
 * @param  {Function} next - pass to next route handler
 */
function getKeywordTypes(req, res, next) {
    return KeywordType.fetchAll()
    .then(keywordtype => {
        return res.status(200).send(keywordtype);
    }).catch(err => {
        console.error(err);
        return res.status(500)
        .json({
            error: "UnknownError"
        });
    });
}


module.exports = {
	getKeywordTypes
};
