'use strict';

const submissionController = require('../controllers/submission');
const authenticationMiddleware = require('../middleware/authentication');

const express = require('express');
let router = express.Router();

router.post(
    '/',
    authenticationMiddleware.validateAuthentication,
    authenticationMiddleware.requireResearcher,
    submissionController.submitGenesAndAnnotations
);

router.post(
    '/:id/curate',
    authenticationMiddleware.validateAuthentication,
    authenticationMiddleware.requireCurator,
    submissionController.curateGenesAndAnnotations
);

router.get(
    '/list/',
    authenticationMiddleware.validateAuthentication,
    authenticationMiddleware.requireCurator,
    submissionController.generateSubmissionSummary
);

router.get(
    '/:id',
    authenticationMiddleware.validateAuthentication,
    authenticationMiddleware.requireCurator,
    submissionController.getSingleSubmission
);

module.exports = router;