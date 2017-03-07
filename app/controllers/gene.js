'use strict';

const logger = require("../services/logger");

const response    = require('../lib/responses');
const locusHelper = require('../lib/locus_submission_helper');

/**
 * Search external resources for a Gene by its full name.
 *
 * Responds with an 200 if we get a single result.
 * Responds with a 404 if we find nothing.
 *
 * @param  {Express.Request}   req  - the request object
 * @param  {Express.Response}   res  - the response object
 * @param  {Function} next - pass to next route handler
 */
function getByLocusName(req, res, next) {
	logger.info('errors for gene.js...');

	locusHelper.verifyLocus(req.params.name)
		.then(locus => response.ok(res, locus))
		.catch(err => {
			if (err.message === `No Locus found for name ${req.params.name}`) {
				return response.notFound(res, `No Locus found for name ${req.params.name}`);
			} else {
				logger.debug(res, err);
				return response.defaultServerError(res, err);
			}
		});
}


module.exports = {
	getByLocusName
};
