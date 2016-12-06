"use strict";

/**
 * @module controllers/user
 */

const _              = require('lodash');
const authentication = require('../lib/authentication');
const bookshelf      = require('../lib/bookshelf');

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
		.then(collection  =>  res.json(collection.serialize()))
		.catch(e => console.error(e))
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
			withRelated: req.query["withRelated"]
		})
		.then(user => res.json(user.serialize()))
		.catch(err => {
			let regMatch;
			if(regMatch = err.message.match(/([a-zA-Z]*) is not defined on the model/)) {
				return res.status(400)
					.json({
						error: "InvalidRelation",
						message: `'${regMatch[1]}' is not a valid relation on this model.`
					});
			}
			// 404
			if(err.message === "EmptyResponse") {
				return res.status(404)
					.json({
						error: "NotFound"
					});
			}
			// Unknown error
			console.error(err);
			return res.status(500)
				.json({
					error: "UnknownError"
				});
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
		return res.status(400)
			.json({
				error: 'BadRequest',
				message: 'User fields cannot be updated: ' + extraFields
			});
	}

	// Validate email address
	if (req.body.email_address && !req.body.email_address.match(TERRIFYING_EMAIL_VALIDATING_REGEX)) {
		return res.status(400)
			.json({
				error: 'BadRequest',
				message: 'Malformed email ' + req.body.email_address
			});
	}

	// Update the user with the provided fields
	let update = Object.assign({id: req.params.id}, req.body);
	User.forge(update)
		.save(null, {method: 'update'})
		.then(updatedUser => {
			return res.status(200)
				.json(updatedUser);
		})
		.catch(err => {
			if (err.toString().includes('No Rows Updated')) {
				return res.status(404)
					.json({
						error: 'NotFound',
						message: 'No User exists for ID ' + req.params.id
					});
			} else {
				return res.status(500)
					.json({
						error: 'UnknownError'
					});
			}
		});
}

/**
 * Delete a user by its ID
 * @param  {Express.Request}   req  - the request object
 * @param  {Express.Reponse}   res  - the response object
 * @param  {Function} next - pass to next handler
 */
function deleteUserById(req, res, next) {
	return User.where('id', req.params.id).fetch({
		require: true,
		withRelated: req.query["withRelated"]
	})
	.then(user => user.destroy())
	.then(result => {
		return res.status(200).send();
	})
	.catch(err => {
		if(err.message === "EmptyResponse") {
			return res.status(404)
				.json({
					error: "NotFound"
				});
		}
		// Unknown error
		console.error(err);
		return res.status(500)
		.json({
			error: "UnknownError"
		});
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
	target_user.fetch({
		withRelated: ["roles"]
	})
	.then(user => {
		return bookshelf.transaction(t => {
			let promises = [];
			req.body.add ? promises.push(user.roles().attach(req.body.add, {transacting: t})) : null;
			req.body.remove ? promises.push(user.roles().detach(req.body.remove, {transacting: t})) : null;
			return Promise.all(promises);
		});
	}).then(result => {
		return target_user.fetch({
			withRelated: ["roles"]
		})
	})
	.then(user => {
		return res.status(200).send(user);
	}).catch(err => {
		console.error(err);
		return res.status(500)
		.json({
			error: "UnknownError"
		});
	});
}



module.exports = {
	getUsers,
	getUserById,
	updateUserById,
	deleteUserById,
	setRoles
};
