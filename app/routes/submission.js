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

router.get(
	'/list/',
	authenticationMiddleware.validateAuthentication,
	authenticationMiddleware.requireCurator,
	submissionController.generateSubmissionSummary
);

router.get(
	'/',
	authenticationMiddleware.validateAuthentication,
	authenticationMiddleware.requireCurator,
	submissionController.getSingleSubmission
);

module.exports = router;
