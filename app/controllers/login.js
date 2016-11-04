"use strict";

const request   = require('request');
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
	if (!req.body.code) {
		return res.status(400).json({
			error: 'Missing field: code'
		});
	}

	let authCode = req.body.code;

	// First we complete the OAuth process started on the frontend
	new Promise((resolve, reject) => {
		request.post({
			url: ORCID_BASE_URL + 'oauth/token',
			form: {
				client_id: orcidInfo.client_id,
				client_secret: orcidInfo.client_secret,
				grant_type: 'authorization_code',
				code: authCode
			}
		},
		(error, response, body) => {
			error ? reject(error) : resolve(body);
		});
	}).then(userTokenResJSON => {
		let userTokenRes = JSON.parse(userTokenResJSON);

		if (!userTokenRes.orcid) {
			return res.status(500).json({
				error: 'OrcidError'
			});
		}

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
				let userName = userTokenRes.name;
				return User.forge({
					name: userName,
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
		return res.status(500).json({err: "UnknownError"});
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
