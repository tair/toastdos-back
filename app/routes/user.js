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
	authenticationMiddleware.validateAuthentication,
	authenticationMiddleware.validateUser,
	userController.getUserById
);

// Set (or update) a specific user's email
router.put(
	'/:id',
	authenticationMiddleware.validateAuthentication,
	authenticationMiddleware.validateUser,
	userController.updateUserById
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
