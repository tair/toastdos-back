'use strict';

const annotationController = require('../controllers/annotation_search');

const express = require('express');
let router = express.Router();

// GET all annotations
router.get('/:searchParameters', annotationController.getAnnotations);

module.exports = router;
