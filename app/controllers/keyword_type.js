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
    .then(collection => res.json(collection.serialize()))
    .catch(e =>console.error(e))

}

/**
 * Get a keywordtype by ID
 * @param  {Express.Request}   req  - the request object
 * @param  {Express.Response}   res  - the response object
 * @param  {Function} next - pass to the next route handler
 */
function getKeywordTypeById(req, res, next) {
    return KeywordType.where('id', req.params.id).fetch({
            require: true,
            withRelated: req.query["withRelated"]
        })
        .then(keywordtype => res.json(keywordtype.serialize()))
        .catch(err => {
            let regMatch;
            if(regMatch = err.message.match(/([a-zA-Z]*) is not defined on the model/)) {
                return res.status(400)
                    .json({
                        error: "InvalidRelation",
                        message: `'${regMatch[1]}' is not a valid relation on this model.`
                    });
            }
            if(err.message === "EmptyResponse") {
                return res.status(404)
                    .json({
                        error: "NotFound"
                    });
            }
            console.error(err);
            return res.status(500)
                .json({
                    error: "UnknownError"
                });
        });
}

/**
 * Controller to create a new KeywordType
 * @param  {Express.request}   req  - the request object
 * @param  {Express.Response}   res  - the response object
 * @param  {Function} next - pass to next route handler
 */
function createKeywordTypes(req, res, next) {
    return KeywordType.forge(req.body)
        .save().then(keywordtype => {
            return res.json(role.serialize());
        })
        .catch(e =>console.error(e))
}

function postMethod(req, res, next){
	//if KeywordType!=comment
    /*POST /api/method/search
    {
    substring: "...",
    annotation_type: "..."
    }
    */
}

module.exports = {
	getKeywordTypes
    getKeywordTypeById
    createKeywordTypes
    postMethod
};
