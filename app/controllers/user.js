'use strict';

/**
 * @module controllers/user
 */

const _              = require('lodash');
const authentication = require('../lib/authentication');
const bookshelf      = require('../lib/bookshelf');
const response       = require('../lib/responses');

const User = require('../models/user');

// Shamelessly ripped off from http://stackoverflow.com/a/11630569
const TERRIFYING_EMAIL_VALIDATING_REGEX = /(?:[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

/**
 * Get all Users in the database
 * @param  {Express.Request}   req  - the request object
 * @param  {Express.Response}   res  - the response object
 * @param  {Function} next - pass to next route handler
 */
function getUsers(req, res, next) {
	return User.fetchAll()
		.then(collection  => response.ok(res, collection.serialize()))
		.catch(err => response.defaultServerError(res, err));
}


/**
 * Get a user by ID
 * @param  {Express.Request}   req  - the request object
 * @param  {Express.Response}   res  - the response object
 * @param  {Function} next - pass to the next route handler
 */
function getUserById(req, res, next) {
	return User.where('id', req.params.id).fetch({
			require: true,
			withRelated: req.query['withRelated']
		})
		.then(user => res.json(user.serialize()))
		.catch(err => {
			let regMatch;
			if (regMatch = err.message.match(/([a-zA-Z]*) is not defined on the model/)) {
				return response.badRequest(res, `'${regMatch[1]}' is not a valid relation on this model.`);
			}
			if (err.message === 'EmptyResponse') {
				return response.notFound(res, 'User not found');
			}

			return response.defaultServerError(res, err);
		});
}

/**
 * Update a specific user.
 * Undefined fields are not modified.
 * Defined but null fields are unset on the user.
 * @param  {Express.Request}   	req  - the request object
 * @param  {Express.Reponse}   	res  - the response object
 * @param  {Function} 			next - pass to next handler
 */
function updateUserById(req, res, next) {
	let mutableFields = ['email_address'];

	// Validate we're only trying to update mutable fields
	let extraFields = Object.keys(_.omit(req.body, mutableFields));
	if (extraFields.length) {
		return response.badRequest(res, `User fields cannot be updated: ${extraFields}`);
	}

	// Validate email address
	if (req.body.email_address && !req.body.email_address.match(TERRIFYING_EMAIL_VALIDATING_REGEX)) {
		return response.badRequest(res, `Malformed email ${req.body.email_address}`);
	}

	// Update the user with the provided fields
	let update = Object.assign({id: req.params.id}, req.body);
	User.forge(update)
		.save(null, {method: 'update'})
		.then(model => model.fetch())
		.then(updatedUser => response.ok(res, updatedUser))
		.catch(err => {
			if (err.toString().includes('No Rows Updated')) {
				return response.notFound(res, `No User exists for ID ${req.params.id}`);
			}

			return response.defaultServerError(res, err);
		});
}

/**
 * Delete a user by its ID
 * @param  {Express.Request}   req  - the request object
 * @param  {Express.Reponse}   res  - the response object
 * @param  {Function} next - pass to next handler
 */
function deleteUserById(req, res, next) {
	return User.where('id', req.params.id)
		.fetch({
			require: true,
			withRelated: req.query['withRelated']
		})
		.then(user => user.destroy())
		.then(result => response.ok(res))
		.catch(err => {
			if (err.message === 'EmptyResponse') {
				return response.notFound(res, 'User not found');
			}

			return response.defaultServerError(res, err);
	});
}

/**
 * Assign/remove roles on a user
 * @param  {Express.Request}   	req  - the request object
 * @param  {Express.Reponse}   	res  - the response object
 * @param  {Function} 			next - pass to next handler
 */
function setRoles(req, res, next) {
	let target_user = User.forge({id: req.params.id});
	target_user
		.fetch({withRelated: ['roles']})
		.then(user => {
			return bookshelf.transaction(t => {
				let promises = [];
				req.body.add ? promises.push(user.roles().attach(req.body.add, {transacting: t})) : null;
				req.body.remove ? promises.push(user.roles().detach(req.body.remove, {transacting: t})) : null;
				return Promise.all(promises);
			});
		})
		.then(result => {
			return target_user.fetch({
			withRelated: ['roles']
			});
		})
		.then(user => response.ok(res, user))
		.catch(err => response.defaultServerError(res, err));
}



module.exports = {
	getUsers,
	getUserById,
	updateUserById,
	deleteUserById,
	setRoles
};
