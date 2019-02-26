'use strict';

const searchExportController = require('../controllers/search_export');

const express = require('express');
let router = express.Router();

router.get('/:annotationParameters', searchExportController.getFile);

module.exports = router;