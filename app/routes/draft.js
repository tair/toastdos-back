'use strict';

const draftController = require('../controllers/draft');

const authenticationMiddleware = require('../middleware/authentication');

const express = require('express');
let router = express.Router();

// POST new draft
router.post(
	'/',
	authenticationMiddleware.validateAuthentication,
	draftController.getDraft
);

module.exports = router;
