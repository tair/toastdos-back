'use strict';

const Keyword     = require('../models/keyword');
const KeywordType = require('../models/keyword_type');

const response = require('../lib/responses');
const knex = require('../lib/bookshelf').knex;

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
    const needsEcoId = keywordType && keywordType.get('name') == 'eco';

			// List of base fields for the queries
    const baseFields = [
        'keyword.id as id',
        'keyword.name as name',
        'keyword.external_id as external_id',
        'keyword.keyword_type_id as keyword_type_id',
        'keyword.is_obsolete as is_obsolete',
    ];

			// Keyword and synonym fields
    const keywordFields = baseFields.slice(0);
    keywordFields.push(knex.raw('NULL as ??', ['syn']));

    const synonymFields = baseFields.slice(0);
    synonymFields.push('synonym.name as syn');

			// Remove is_obsolete from the final return value.
    const finalFields = [
        'id',
        'name',
        'syn as synonym',
        'external_id',
        'keyword_type_id',
    ];

			// Add eco id to eco terms.
    if (needsEcoId) {
        finalFields.push('keyword_mapping.evidence_code as evidence_code');
    }

			// Create the subquerys for searching cannonical names and synonym names.
    const keywordQuery = knex.select(keywordFields)
				.from('keyword')
				.where('keyword.name', 'LIKE', `%${req.query.substring}%`)
				.orWhere('external_id', 'LIKE', `%${req.query.substring}%`);

    const synonymQuery = knex.select(synonymFields)
				.from('synonym')
				.leftJoin('keyword', 'keyword.id', 'synonym.keyword_id')
				.where('synonym.name', 'LIKE', `%${req.query.substring}%`);

			// Union the results of the two query
    const unionQuery = keywordQuery.union(synonymQuery).as('unionQuery');
    const finalQuery = knex.select(finalFields).from(unionQuery);

			// Limit results to the keyword type, if provided.
    if (keywordType) {
        finalQuery.where('keyword_type_id', '=', keywordType.get('id'));
    }

			// If it's an eco, we need to add the eco_id.
    if (needsEcoId) {
        finalQuery.rightJoin('keyword_mapping', 'unionQuery.external_id', 'keyword_mapping.eco_id');
    }

			// Make sure the keyword is not obsolete and that it has an external id.
    finalQuery.whereNot('is_obsolete', 1);
    finalQuery.whereNotNull('external_id');

			// Order the canonical results first and only show 20.
    finalQuery.orderBy('synonym', 'desc');
    finalQuery.offset(0).limit(KEYWORD_SEARCH_LIMIT);
    return finalQuery;
})
		.then(results => response.ok(res, results))
		.catch(err => {
			// This error happens if we can't find a KeywordType matching the provided scope
    if (err.message.includes('EmptyResponse')) {
        return response.badRequest(res, `Invalid keyword_scope ${req.query.keyword_scope}`);
    }

    response.defaultServerError(res, err);
});
}


module.exports = {
    partialKeywordMatch
};
