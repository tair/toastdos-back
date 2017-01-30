'use strict';

const AnnotationStatus = require('../models/annotation_status');

const response = require('../lib/responses');

/**
 * Gets the list of all annotation statuses in our system
 * @param  {Express.Request}   req  - the request
 * @param  {Express.Resonse}   res  - the response
 * @param  {Function} next - pass to next route handler
 */
function getAnnotationStatuses(req, res, next) {
	AnnotationStatus.fetchAll()
		.then(statuses => {
			response.ok(res, statuses);
		})
		.catch(err => {
			response.defaultServerError(res, err);
		});
}


module.exports = {
	getAnnotationStatuses
};
