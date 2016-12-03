"use strict";

const auth = require('../lib/authentication');

/**
 * Verify that a token is valid, thus proving that this user
 * is properly authenticated/logged in
 */
function validateAuthentication(req, res, next) {
	// Sidestep the need for authentication for automated tests
	if (process.env.NODE_ENV === 'test') {
		return next();
	}

	// Validate an authorization header was provided
	let authHeader = req.get('Authorization');
	if(!authHeader) {
		return res.status(401).send({
			error: 'Unauthorized',
			message: 'No authorization header provided.'
		})
	}

	// Validate that authorization header contains a token
	let authMatch = authHeader.match(/Bearer\ (.*)$/);
	if(!authMatch) {
		return res.status(401).send({
			error: 'Unauthorized',
			message: 'No authorization token provided in header.'
		});
	}

	return auth.verifyToken(authMatch[1], (err, data) => {
		if(err) {
			if(err.name === 'TokenExpiredError') {
				return res.status(401).json({
					error: 'TokenExpired',
					message: 'jwt expired'
				});
			} else {
				// JsonWebTokenError
				return res.status(401).json({
					error: 'JsonWebTokenError',
					message: 'jwt malformed'
				});
			}
		}



		return next();

	});
}

/**
 * Middleware that ensures User in the auth token
 * matches the User whose info we're retrieving.
 */
function validateUser(req, res, next) {
	// todo implement
}


module.exports = {
	validateAuthentication
};
