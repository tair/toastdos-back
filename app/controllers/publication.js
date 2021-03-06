'use strict';

const response = require('../lib/responses');
const validator = require('../lib/publication_id_validator');

/**
 * Identifies the type of publication ID we've been sent,
 * then queries the publication source to verify the
 * ID references an existing publication.
 *
 * Responses:
 * 200 with publication information
 * 404 if we can't find a publication
 */
function validatePublicationId(req, res) {
    const pubId = req.body.publication_id;

    if (validator.isDOI(pubId)) {
        validator.validateDOI(pubId)
            .then(query => {
                response.ok(res, {
                    type: 'doi',
                    url: query.values[0].data.value
                });
            })
            .catch(err => response.notFound(res, err.message));
    } else if (validator.isPubmedId(pubId)) {
        validator.validatePubmedId(pubId)
            .then(query => {
                response.ok(res, {
                    type: 'pubmed_id',
                    title: query.result[pubId].title,
                    author: query.result[pubId].authors[0].name
                });
            })
            .catch(err => response.notFound(res, err.message));
    } else {
        return response.notFound(res, `Invalid publication ID ${pubId}`);
    }
}


module.exports = {
    validatePublicationId
};