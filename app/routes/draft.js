'use strict';

const draftController = require('../controllers/draft');

const authenticationMiddleware = require('../middleware/authentication');

const express = require('express');
let router = express.Router();

// GET drafts for current user
router.get(
	'/',
	authenticationMiddleware.validateAuthentication,
	draftController.getDraftsForUser
);

// POST new draft
router.post(
	'/',
	authenticationMiddleware.validateAuthentication,
	draftController.createDraft
);

module.exports = router;
