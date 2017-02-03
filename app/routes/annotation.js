'use strict';

const annotationController = require('../controllers/annotation');

const authenticationMiddleware = require('../middleware/authentication');

const express = require('express');
let router = express.Router();

// POST new Annotation
router.post(
	'/',
	authenticationMiddleware.validateAuthentication,
	annotationController.createAnnotation
);

module.exports = router;
