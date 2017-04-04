'use strict';

const AnnotationStatus = require('../models/annotation_status');

const response = require('../lib/responses');

/**
 * Gets the list of all annotation statuses in our system
 * Responses:
 * 200 with list of all Annotation statuses
 * 500 on internal error
 */
function getAnnotationStatuses(req, res, next) {
	AnnotationStatus.fetchAll()
		.then(statuses => response.ok(res, statuses))
		.catch(err => response.defaultServerError(res, err));
}


module.exports = {
	getAnnotationStatuses
};
