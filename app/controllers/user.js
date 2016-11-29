"use strict";

/**
 * @module controllers/user
 */

const _              = require('lodash');
const authentication = require('../lib/authentication');
const bookshelf      = require('../lib/bookshelf');

const User = require('../models/user');

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

	// Update the user with the provided fields
	let update = _.assign({id: req.params.id}, req.body);
	User.forge(update)
		.on('created', () => {
			return res.status(404)
				.json({
					error: 'NotFound',
					message: 'No User exists for ID ' + req.params.id
				});
		})
		.save()
		.then(updatedUser => {
			return res.status(200)
				.json(updatedUser);
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
