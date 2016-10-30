"use strict";

const request   = require('request-promise');
const jwt       = require('jsonwebtoken');
const fs        = require('fs');

const User      = require('../models/user');
const orcidInfo = require('../../resources/orcid_user_info.json');

const ORCID_BASE_URL = 'https://orcid.org/';

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
	}).then(userTokenResJSON => {
		let userTokenRes = JSON.parse(userTokenResJSON);
		let orcidId = userTokenRes.orcid;

		// Try to find the user associated with the orcid_id
		return User.where('orcid_id', orcidId).fetch().then(user => {

			// Return that user if they exist
			if (user) {
				let userJwt = signedToken({user_id: user.id});
				return res.status(200).json({
					jwt: userJwt
				});
			}
			else {
				// Make the user if they don't exist
				let userNames = userTokenRes.name.split(' ');
				return User.forge({
					first_name: userNames[0],
					last_name: userNames[1],
					orcid_id: orcidId
				}).save().then(newUser => {
					let userJwt = signedToken({user_id: newUser.id});
					return res.status(201).json({
						jwt: userJwt
					});
				});
			}
		});
	}).catch(err => {

		// Default error handling
		console.log(err);
		return res.status(500).json({err: "An unknown error has occured"});
	});
}

// Return a jwt signed with our private key
function signedToken(contents) {
	var privateKey = fs.readFileSync('./resources/privkey.pem');
	return jwt.sign(contents, privateKey);
}

module.exports = {
	login
};
