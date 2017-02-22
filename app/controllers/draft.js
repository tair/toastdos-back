'use strict';

const User =require('../models/user');
const Draft=require('../models/draft');

const response = require('../lib/responses');


/**
 * Adds the Draft to the table
 * @param  {Express.Request}   	req  - the request object
 * @param  {Express.Reponse}   	res  - the response object
 * @param  {Function} 			next - pass to next handler
 */

function getDraft(req, res, next){
    //check submitter_id
	if(!req.body.submitter_id){
		return response.badRequest(res, `submitter_id is missing`);
	}
	//400 bad request if missing either wip_state or submitter_id, or if submitter_id is invalid
	if (!req.body.wip_state) {
		return response.badRequest(res, `Draft (wip state) is missing or invalid`);
	}
	//TODO wait for middleware
	User.where({id: req.body.submitter_id}).fetch({require: true})
		.then(user => {
			return Draft.forge(req.body).save();

		})
		.then(draft =>{
			return response.created(res, draft);
			}

		)
		.catch(err => {
			if(err.message ==='EmptyResponse'){
				return response.badRequest(res,`submitter_id is invalid ${req.body.submitter_id}`);
			}
			return response.defaultServerError(res,err);
		});
}

module.exports={
	getDraft
};