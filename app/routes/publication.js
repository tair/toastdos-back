"use strict";

const publicationController = require('../controllers/publication');

const express = require('express');
let router = express.Router();

// POST annotation validation
router.post('/', publicationController.validatePublicationId);

module.exports = router;
