'use strict';

const annotationStatusController = require('../controllers/annotation_status');

const express = require('express');
let router = express.Router();

// GET all Annotation statuses
router.get('/', annotationStatusController.getAnnotationStatuses);

module.exports = router;