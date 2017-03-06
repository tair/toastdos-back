'use strict';

const submissionController = require('../controllers/submission');
const authenticationMiddleware = require('../middleware/authentication');

const express = require('express');
let router = express.Router();

router.post(
	'/',
	authenticationMiddleware.validateAuthentication,
	submissionController.submitGenesAndAnnotations
);

module.exports = router;
