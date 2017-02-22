'use strict';

const draftController = require('../controllers/draft');

const express = require('express');
let router = express.Router();

// POST new draft
router.post('/', draftController.getDraft);

module.exports = router;