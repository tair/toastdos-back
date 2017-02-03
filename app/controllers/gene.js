'use strict';

const response = require('../lib/responses');
const Uniprot  = require('../lib/uniprot_api');

/**
 * Get a Gene by its full name.
 * Responds with an 200 if we get a single result.
 * Responds with a 404 if we find nothing.
 * Responds with a 400 if we find multiple results (because this isn't a search function).
 *
 * @param  {Express.Request}   req  - the request object
 * @param  {Express.Response}   res  - the response object
 * @param  {Function} next - pass to next route handler
 */
function getByFullName(req, res, next) {
	Uniprot.searchGeneByName(req.params.name)
		.then(genes => {
			if (genes.length > 1) {
				return response.badRequest(res, 'Given query matches multiple genes');
			} else {
				return response.ok(res, genes[0]);
			}
		})
		.catch(err => {
			if (err.message.match(/Given query matches no genes/)) {
				return response.notFound(res, 'Given query matches no genes')
			} else {
				return response.defaultServerError(res, err);
			}
		});
}

module.exports = {
	getByFullName
};
