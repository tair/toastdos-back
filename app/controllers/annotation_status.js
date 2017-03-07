'use strict';

const logger = require("../services/logger");

const AnnotationStatus = require('../models/annotation_status');

const response = require('../lib/responses');

/**
 * Gets the list of all annotation statuses in our system
 * @param  {Express.Request}   req  - the request
 * @param  {Express.Resonse}   res  - the response
 * @param  {Function} next - pass to next route handler
 */
function getAnnotationStatuses(req, res, next) {
	logger.info('errors for getAnnotationStatuses.js...');
	AnnotationStatus.fetchAll()
		.then(statuses => {
			response.ok(res, statuses);
		})
		.catch(err => {
			logger.debug(res, error);
			response.defaultServerError(res, err);
		});
}


module.exports = {
	getAnnotationStatuses
};
