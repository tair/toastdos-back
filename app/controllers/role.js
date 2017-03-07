'use strict';
/**
 * @module controllers/user
 */
const logger = require("../services/logger");

const Role = require('../models/role');

const response = require('../lib/responses');

/**
 * Get all Roles in the database
 * @param  {Express.Request}   req  - the request object
 * @param  {Express.Response}  res  - the response object
 * @param  {Function} next - pass to next route handler
 */
function getRoles(req, res, next) {
	logger.info('errors for getRoles in role.js...');
	return Role.fetchAll()
		.then(collection => response.ok(res, collection.serialize()))
		.catch(err => {
			logger.debug(res,err);
			return response.defaultServerError(res, err)
		});
}

/**
 * Controller to create a new Role
 * @param  {Express.request}   req  - the request object
 * @param  {Express.Response}   res  - the response object
 * @param  {Function} next - pass to next route handler
 */
function createRole(req, res, next) {
	logger.info('errors for createRoles in role.js...');
	return Role.forge(req.body)
		.save()
		.then(role => response.ok(res, role.serialize()))
		.catch(err => {
			logger.debug(res,err);
			return response.defaultServerError(res, err)
		});
}

/**
 * Controller to get all users in a given role
 * @param  {Express.request}   req  - the request object
 * @param  {Express.Response}   res  - the response object
 * @param  {Function} next - pass to the next route handler
 */
function getRoleUsers(req, res, next) {
	logger.info('errors for getRolesUsers in role.js...');
	return Role.forge({id: req.params.id})
		.fetch({withRelated: 'users'})
		.then(role => response.ok(res, role.related('users')))
		.catch(err => {
			logger.debug(res,err);
			return response.defaultServerError(res, err)
		});
}


module.exports = {
	getRoles,
	createRole,
	getRoleUsers
};
