"use strict";

const request   = require('request-promise');
const jwt       = require('jsonwebtoken');

const User      = require('../models/user');
const orcidInfo = require('../../resources/orcid_user_info.json');

const ORCID_BASE_URL = 'https://sandbox.orcid.org/';

/**
 * Controller to log in with an ORCID auth code
 * @param  {Express.request}   req  - the request object
 * @param  {Express.Response}   res  - the response object
 * @param  {Function} next - pass to next route handler
 */
function login(req, res, next) {
	let authCode = req.body.code;

	// First we complete the OAuth process started on the frontend
	request.post({
		url: ORCID_BASE_URL + 'oauth/token',
		form: {
			client_id: orcidInfo.client_id,
			client_secret: orcidInfo.client_secret,
			grant_type: 'authorization_code',
			code: authCode
		}
	}).then(userTokenRes => {
		// Return a JWT with the user's id
		return User.where('orcid', userTokenRes.orcid_id).fetch()
			.then(user => {
				let userJwt = jwt.sign({ user_id: user.id });
				return res.status(201).json({
					jwt: userJwt
				});
			});
	}).catch(err => {

		// Default error handling
		console.log(err);
		return res.status(500).json({err: "An unknown error has occured"});
	});
}

module.exports = {
	login
};
