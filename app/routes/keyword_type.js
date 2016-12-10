"use strict";

const keywordTypeController = require('../controllers/keyword_type');

const express = require('express');
let router = express.Router();

// GET all keywordtype
router.get(
    '/',            // route
    keywordTypeController.getKeywordTypes    // the controller
);

module.exports = router;
