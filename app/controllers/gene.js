'use strict';

const response    = require('../lib/responses');
const locusHelper = require('../lib/locus_submission_helper');

/**
 * Search external resources for a Gene by its full name.
 *
 * Responses:
 * 200 if we successfully find the gene
 * 404 if we find nothing
 */
function getByLocusName(req, res, next) {
	locusHelper.verifyLocus(req.params.name)
		.then(locus => response.ok(res, locus))
		.catch(err => {
			if (err.message === `No Locus found for name ${req.params.name}`) {
				return response.notFound(res, `No Locus found for name ${req.params.name}`);
			} else {
				return response.defaultServerError(res, err);
			}
		});
}


module.exports = {
	getByLocusName
};
