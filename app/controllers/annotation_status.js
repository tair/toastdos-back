"use strict";

const AnnotationStatus = require('../models/annotation_status');

/**
 * Gets the list of all annotation statuses in our system
 * @param  {Express.Request}   req  - the request
 * @param  {Express.Resonse}   res  - the response
 * @param  {Function} next - pass to next route handler
 */
function getAnnotationStatuses(req, res, next) {
	AnnotationStatus.fetchAll()
		.then(statuses => {
			res.status(200).json(statuses);
		})
		.catch(err => {
			res.status(500).send('Internal Server Error');
		});
}


module.exports = {
	getAnnotationStatuses
};
