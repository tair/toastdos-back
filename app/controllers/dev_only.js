"use strict";

/**
 * This controller is for endpoints we're using in development only.
 * This functionality will not be available in production.
 */

const auth = require('../lib/authentication');
const User = require('../models/user');

/**
 * Validates that the specified user ID exists, then returns a
 * JWT signed with that user ID.
 * This sidesteps the need to manually login / validate through the orcid site.
 */
function makeDevToken(req, res, next) {
	User.where({id: req.params.id})
		.fetch()
		.then(fetchedUser => {
			if (!fetchedUser) {
				return res.status(400).send(`User with id ${req.params.id} does not exist`);
			}

			return auth.signToken({user_id: fetchedUser.attributes.id}, (err, token) => {
				if (err) {
					return res.status(500).send(err.message);
				} else {
					return res.status(200).json({
						dev_token: token
					});
				}
			});

		})
		.catch(err => {
			return res.status(500).send(err.message);
		});
}

module.exports = {
	makeDevToken
};
