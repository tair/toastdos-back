'use strict';

/**
 * This controller is for endpoints we're using in development only.
 * This functionality will not be available in production.
 */

const auth     = require('../lib/authentication');
const response = require('../lib/responses');

const User = require('../models/user');
const Role = require('../models/role');

/**
 * Validates that the specified user ID exists, then returns a
 * JWT signed with that user ID.
 * This sidesteps the need to manually login / validate through the orcid site.
 */
function makeDevToken(req, res) {
    User.where({id: req.params.id})
		.fetch()
		.then(fetchedUser => {
    if (!fetchedUser) {
        return response.badRequest(res, `User with id ${req.params.id} does not exist`);
    }

    return auth.signToken({user_id: fetchedUser.get('id')}, (err, token) => {
        if (err) {
            return response.serverError(res, err.message);
        } else {
            return response.ok(res, {
                dev_token: token
            });
        }
    });

})
		.catch(err => {
    return response.defaultServerError(res, err);
});
}

/**
 * Makes a user with all roles.
 * Responds with created user.
 */
function makeSuperUser(req, res) {
    let getRolesProm = Role.fetchAll();

	// Make a new user with a random Orcid ID.
    let randId = Math.floor(Math.random() * 9999);
    let makeUserProm = User.forge({
        name: 'Test SuperUser',
        orcid_id: `FAKE-ORCID-ID-${randId}`
    })
		.save()
		.catch(err => {
    if (err.message.includes('UNIQUE constraint failed: user.orcid_id')) {
        throw new Error(
					'Generated a test user with the same random ORCID ID as an existing test user. ' +
					'You should clean up old test users from the database (and maybe buy a lottery ticket).'
				);
    }
    throw err;
});

    Promise.all([getRolesProm, makeUserProm]).then(([roles, user]) => {
        return Promise.all(roles.map(role => user.roles().attach(role)))
				.then(() => user.fetch({withRelated: 'roles'}));
    })
		.then(fullUser => response.created(res, fullUser))
		.catch(err => response.serverError(res, err.message));

}

module.exports = {
    makeDevToken,
    makeSuperUser
};
