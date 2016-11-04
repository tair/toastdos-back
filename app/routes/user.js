"use strict";

const userController = require('../controllers/user');
const authenticationMiddleware = require('../middleware/authentication');

const express = require('express');
let router = express.Router();

// GET all users
router.get(
	'/',			// route
	authenticationMiddleware.validateAuthentication,	// isAuthenticated middleware
	userController.getUsers		// the controller
);

// GET a specific user
router.get(
	'/:id',
	authenticationMiddleware.validateAuthentication,	// isAuthenticated middleware
	userController.getUserById
);

// DELETE a user
router.delete(
	'/:id',
	authenticationMiddleware.validateAuthentication,	// isAuthenticated middleware
	userController.deleteUserById
);

// PATCH a user with added and removed roles
router.patch(
	'/:id/roles',
	authenticationMiddleware.validateAuthentication,
	userController.setRoles
);

module.exports = router;