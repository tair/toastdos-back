'use strict';

const User     = require('../models/user');
const auth     = require('../lib/authentication');
const Orcid    = require('../lib/orcid_api');
const response = require('../lib/responses');

/**
 * Controller for logging in with an ORCID auth code.
 * Automatically creates Users in our system on first login.
 * Handles updated information from ORCID (name, email, etc...)
 *
 * Responses:
 * 200 with JWT on successful login
 * 201 with JWT on first login (user is created)
 * 400 if an OAuth code is not provided
 * 500 if there's a problem authenticating with ORCID
 */
function login(req, res, next) {
	if (!req.body.code) {
		return response.badRequest(res, 'Missing field: code');
	}

	// First we complete the OAuth process started on the frontend
	Orcid.getUserToken(req.body.code).then(userTokenRes => {
		if (!userTokenRes.orcid) {
			return response.serverError(res, `Orcid error: "${userTokenRes.error_description}"`);
		}

		let orcidId = userTokenRes.orcid;
		let userName = userTokenRes.name;

		// Try to find the user associated with the orcid_id
		return User.where('orcid_id', orcidId).fetch().then(user => {

			// Return that user if they exist
			if (user) {
				// Update the user's name if it's been changed in the ORCID system
				let userPromise;
				if(user.get('name') !== userName){
					userPromise = user.set({name: userName}).save()
				} else {
					userPromise = Promise.resolve(user);
				}
				return userPromise.then(resolvedUser => {
					auth.signToken({user_id: resolvedUser.attributes.id}, (err, userJwt) => {
						return response.ok(res, {
							jwt: userJwt
						});
					});
				});
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
