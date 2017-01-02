"use strict";

const Uniprot = require('../lib/uniprot_api');

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
				return res.status(400).send('Given query matches multiple genes');
			} else {
				return res.status(200).send(genes[0]);
			}
		})
		.catch(err => {
			if (err.message.match(/Given query matches no genes/)) {
				return res.status(404).send('Given query matches no genes');
			} else {
				return res.status(500).send('Unknown Server Error');
			}
		});
}

module.exports = {
	getByFullName
};
