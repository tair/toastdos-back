'use strict';

const KeywordTemp = require('../models/keyword_temp');

const response = require('../lib/responses');

/**
 * Gets all temp keywords.s
 *
 * Responses:
 * 200 on successful retrieval.
 * 500 on internal error.
 */
function getAllKeywordTemps(req, res) {
    return KeywordTemp.fetchAll({
        withRelated:[
            {
                'keywordType': function(qb) {
                    qb.select('id','name');
                }
            },
            {
                'submitter': function(qb) {
                    qb.select('id','name','orcid_id','email_address');
                }
            },
            {
                'geneTermAnnotation.parentData': function(qb) {
                    qb.select('id','publication_id','submission_id','annotation_id');
                }
            },    
            {
                'geneTermAnnotation.parentData.publication': function(qb) {
                    qb.select('id', 'doi', 'pubmed_id');
                }
            },
        ]
    })
        .then(keywordTemps => {
            let refinedKeywordTemps = keywordTemps.map(keywordTemp => {
                let refinedKeywordTemp = {
                    id: keywordTemp.get('id'),
                    keyword_type: keywordTemp.related('keywordType'),
                    name: keywordTemp.get('name'),
                    created_at: keywordTemp.get('created_at'),
                    submitter: keywordTemp.related('submitter'),
                };
                let geneTermAnnotations = keywordTemp.related('geneTermAnnotation')
                let refinedGeneTermAnnotations = geneTermAnnotations.map(geneTermAnnotation => {
                    const publication = geneTermAnnotation.related('parentData').related('publication');
                    let publicationData;
                    if (publication.get('doi')) {
                        publicationData = 'DOI: ' + publication.get('doi');
                    } else if (publication.get('pubmed_id')) {
                        publicationData = 'PMID: ' + publication.get('pubmed_id');
                    }
                    let refinedGeneTermAnnotation = {
                        submission_id: geneTermAnnotation.related('parentData').get('submission_id'),
                        publication_name: publicationData
                    }
                    return refinedGeneTermAnnotation;
                })
                // refinedGeneGeneAnnotations.concat(refinedGeneTermAnnotations);
                refinedKeywordTemp.submissions = refinedGeneTermAnnotations;
                return refinedKeywordTemp;
            });
            return response.ok(res, refinedKeywordTemps);
        })
        .catch(err => {
            logger.info(err);
            return response.defaultServerError(res, err);
        });
}

module.exports = {
    getAllKeywordTemps,
};