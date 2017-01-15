"use strict";

/**
 * This controller is for endpoints we're using in development only.
 * This functionality will not be available in production.
 */

const auth = require('../lib/authentication');

function makeDevToken(req, res, next) {
	return auth.signToken(req.body, (err, token) => {
		if (err) {
			return res.status(500).send(err.message);
		} else {
			return res.status(200).json({
				dev_token: token
			});
		}
	});
}

module.exports = {
	makeDevToken
};
