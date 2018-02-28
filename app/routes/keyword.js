'use strict';

const keywordController = require('../controllers/keyword');

const express = require('express');
let router = express.Router();

// Search for keywords using a partial string
router.get('/search', keywordController.partialKeywordMatch);

module.exports = router;