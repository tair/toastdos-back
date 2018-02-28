'use strict';

const KeywordType = require('../models/keyword_type');

const response = require('../lib/responses');

/**
 * Get all KeywordTypes in the database
 *
 * Responses:
 * 200 with list of keyword types
 * 500 on internal server error
 */
function getKeywordTypes(req, res) {
    return KeywordType
        .fetchAll()
        .then(keywordtypes => response.ok(res, keywordtypes))
        .catch(err => response.defaultServerError(res, err));
}


module.exports = {
    getKeywordTypes
};