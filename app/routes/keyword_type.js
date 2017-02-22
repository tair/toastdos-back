'use strict';

const keywordTypeController = require('../controllers/keyword_type');

const express = require('express');
let router = express.Router();

// GET all keywordtype
router.get('/', keywordTypeController.getKeywordTypes);

module.exports = router;
