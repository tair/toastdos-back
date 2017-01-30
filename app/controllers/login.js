'use strict';

const User  = require('../models/user');
const auth  = require('../lib/authentication');
const Orcid = require('../lib/orcid_api');

/**
 * Controller to log in with an ORCID auth code
 * @param  {Express.request}   req  - the request object
 * @param  {Express.Response}   res  - the response object
 * @param  {Function} next - pass to next route handler
 */
function login(req, res, next) {
	if (!req.body.code) {
		return res.status(400).json({
			error: 'Missing field: code'
		});
	}

	// First we complete the OAuth process started on the frontend
	Orcid.getUserToken(req.body.code).then(userTokenRes => {
		if (!userTokenRes.orcid) {
			return res.status(500).json({
				error: 'OrcidError'
			});
		}

		let orcidId = userTokenRes.orcid;
		let userName = userTokenRes.name;

		// Try to find the user associated with the orcid_id
		return User.where('orcid_id', orcidId).fetch().then(user => {

			// Return that user if they exist
			if (user) {
				auth.signToken({user_id: user.attributes.id}, (err, userJwt) => {

					return res.status(200).json({
						jwt: userJwt
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
						return res.status(201).json({
							jwt: userJwt
						});
					});
				});
			}
		});
	}).catch(err => {
		if (err.message.includes('Unexpected token < in JSON')) {
			return res.status(500).send('Backend failed to authenticate with ORCID. Did you update the orcid_app_info resource with your ORCID ID?');
		}

		// Default error handling
		return res.status(500).json({err: "UnknownError"});
	});
}

module.exports = {
	login
};
