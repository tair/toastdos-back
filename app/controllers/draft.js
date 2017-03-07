'use strict';

const logger = require("../services/logger");

const Draft = require('../models/draft');

const response = require('../lib/responses');


/**
 * Adds the Draft to the table
 * @param  {Express.Request}   	req  - the request object
 * @param  {Express.Reponse}   	res  - the response object
 * @param  {Function} 			next - pass to next handler
 */

function getDraft(req, res, next){
	logger.info('errors for draft.js...');
	if (!req.body.wip_state) {
		logger.debug(res,`Draft (wip state) is missing or invalid`);
		return response.badRequest(res, `Draft (wip state) is missing or invalid`);
	}
	Draft.forge({
		submitter_id: req.user.attributes.id,
		wip_state: req.body.wip_state
	})
	.save()
	.then(draft => response.created(res, draft))
	.catch(err => {
		logger.debug(res,err);
		return response.defaultServerError(res, err)
     });
}

module.exports={
	getDraft
};
