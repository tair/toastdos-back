'use strict';

const auth     = require('../lib/authentication');
const response = require('../lib/responses');

const TOKEN_MATCHER = /Bearer (.*)$/;

/**
 * Verify that a token is valid, thus proving that this user
 * is properly authenticated/logged in
 */
function validateAuthentication(req, res, next) {

	// Validate an authorization header was provided
	let authHeader = req.get('Authorization');
	if(!authHeader) {
		return response.unauthorized(res, 'No authorization header provided.');
	}

	// Validate that authorization header contains a token
	let authMatch = authHeader.match(TOKEN_MATCHER);
	if(!authMatch) {
		return response.unauthorized(res, 'No authorization token provided in header.');
	}

	return auth.verifyToken(authMatch[1], (err, tokenBody) => {
		if(err) {
			if(err.name === 'TokenExpiredError') {
				return response.unauthorized(res, 'JWT expired');
			} else {
				return response.unauthorized(res, 'JWT malformed');
			}
		}

		if (!tokenBody.user_id) {
			return response.unauthorized(res, 'No user_id in JWT');
		}

		// Embed the retrieved user in the request object so controllers
		// down the line know what user is making the request
		req.user_id = tokenBody.user_id;

		return next();
	});
}

/**
 * Middleware that ensures User in the auth token
 * matches the User whose info we're retrieving.
 */
function validateUser(req, res, next) {

	// Assume the token itself has been validated and user_id has been attached already
	if (!req.params.id || req.params.id != req.user_id) {
		return response.unauthorized(res, 'Unauthorized to view requested user');
	}

	return next();
}


module.exports = {
	validateAuthentication,
	validateUser
};
