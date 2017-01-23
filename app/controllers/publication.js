'use strict';

const validator = require('../lib/publication_id_validator');

/**
 * Identifies the type of publication ID we've been sent,
 * then queries the publication source to verify the
 * ID references an existing publication.
 *
 * @param  {Express.Request}   req  - the request
 * @param  {Express.Resonse}   res  - the response
 * @param  {Function} next - pass to next route handler
 */
function validatePublicationId(req, res, next) {
	const pubId = req.body.publication_id;

	if (validator.isDOI(pubId)) {
		validator.validateDOI(pubId)
			.then(query => {
				res.status(200).json({
					type: 'doi',
					url: query.values[0].data.value
				});
			})
			.catch(err => res.status(404).send(err.message));
	}
	else if (validator.isPubmedId(pubId)) {
		validator.validatePubmedId(pubId)
			.then(query => {
				res.status(200).json({
					type: 'pubmed_id',
					title: query.result[pubId].title,
					author: query.result[pubId].authors[0].name
				});
			})
			.catch(err => res.status(404).send(err.message));
	}
	else {
		return res.status(400).send(`Invalid publication ID ${pubId}`);
	}
}


module.exports = {
	validatePublicationId
};
