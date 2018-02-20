'use strict';

const exportsController = require('../controllers/exports');
const config = require('../../config');
const path = require('path');
const express = require('express');
let router = express.Router();

router.get(
	'/',
	exportsController.list
);

router.use(
	'/files',
	express.static(path.join(config.resourceRoot, 'exports'))
);

module.exports = router;