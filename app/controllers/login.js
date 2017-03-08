'use strict';

const User     = require('../models/user');
const auth     = require('../lib/authentication');
const Orcid    = require('../lib/orcid_api');
const response = require('../lib/responses');

/**
 * Controller to log in with an ORCID auth code
 * @param  {Express.request}   req  - the request object
 * @param  {Express.Response}   res  - the response object
 * @param  {Function} next - pass to next route handler
 */
function login(req, res, next) {
	if (!req.body.code) {
		return response.badRequest(400, 'Missing field: code');
	}

	// First we complete the OAuth process started on the frontend
	Orcid.getUserToken(req.body.code).then(userTokenRes => {
		if (!userTokenRes.orcid) {
			return response.serverError(res, 'Orcid error');
		}

		let orcidId = userTokenRes.orcid;
		let userName = userTokenRes.name;

		// Try to find the user associated with the orcid_id
		return User.where('orcid_id', orcidId).fetch().then(user => {

			// Return that user if they exist
			if (user) {
				let userPromise;
				// Update the user's name if it changed
				if(user.get('name') !== userName){
					userPromise = user.set({name: userName}).save()
				}
				else {
					userPromise = Promise.resolve(user);
				}
				return userPromise.then(resolvedUser => {
					auth.signToken({user_id: resolvedUser.attributes.id}, (err, userJwt) => {
						return response.ok(res, {
							jwt: userJwt
						})
					})
				})
			}
			else {
				// Make the user if they don't exist
				return User.forge({
					name: userName,
					orcid_id: orcidId
				}).save().then(newUser => {
					auth.signToken({user_id: newUser.attributes.id}, (err, userJwt) => {
						return response.created(res, {
							jwt: userJwt
						});
					});
				});
			}
		});
	}).catch(err => {
		if (err.message.includes('Unexpected token < in JSON')) {
			return response.serverError(res, 'Backend failed to authenticate with ORCID. Did you update the orcid_app_info resource with your ORCID ID?');
		}

		return response.defaultServerError(res, err);
	});
}

module.exports = {
	login
};
