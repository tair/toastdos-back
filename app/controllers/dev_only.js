'use strict';

/**
 * This controller is for endpoints we're using in development only.
 * This functionality will not be available in production.
 */

const logger = require("../services/logger");

const auth     = require('../lib/authentication');
const response = require('../lib/responses');

const User = require('../models/user');

/**
 * Validates that the specified user ID exists, then returns a
 * JWT signed with that user ID.
 * This sidesteps the need to manually login / validate through the orcid site.
 */
function makeDevToken(req, res, next) {
	logger.info('errors for dev_only.js...');
	User.where({id: req.params.id})
		.fetch()
		.then(fetchedUser => {
			if (!fetchedUser) {
				logger.debug(res, `User with id ${req.params.id} does not exist`);
				return response.badRequest(res, `User with id ${req.params.id} does not exist`);
			}

			return auth.signToken({user_id: fetchedUser.attributes.id}, (err, token) => {
				if (err) {
					logger.debug(res, err.message);
					return response.serverError(res, err.message);
				} else {
					return response.ok(res, {
						dev_token: token
					});
				}
			});

		})
		.catch(err => {
			logger.debug(res,err);
			return response.defaultServerError(res, err);
		});
}

module.exports = {
	makeDevToken
};
