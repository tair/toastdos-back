'use strict';

const loginController = require('../controllers/login');

const express = require('express');
let router = express.Router();

router.post('/', loginController.login);

module.exports = router;