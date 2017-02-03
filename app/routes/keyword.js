'use strict';

const keywordController = require('../controllers/keyword');

const express = require('express');
let router = express.Router();

// POST search for keywords using partial string
router.post('/search', keywordController.partialKeywordMatch);

module.exports = router;
