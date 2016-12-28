"use strict";

const {enableCORS, allowHeaders, allowMethods} = require('../middleware/utils');

const express = require('express');
let router = express.Router();

const authenticationController = require('../controllers/authentication');


// enable cors
router.use(enableCORS, allowHeaders, allowMethods);

router.use('/user', require('./user'));
router.use('/car', require('./car'));
router.use('/role', require('./role'));
router.use('/login', require('./login'));
router.use('/keywordtype', require('./keyword_type'));
router.use('/annotationstatus', require('./annotation_status'));

//router.post('/login', authenticationController.login);

// Generate 404s
router.use((req, res, next) => {
 	let err = new Error('Not Found');
 	err.status = 404;
 	next(err);
});

// Handle errors
router.use((err, req, res, next) => {
	res.status(err.status || 500);
	(err.status === 500) ? console.log(err.stack) : null;
	res.json({
    	message: err.message,
    	error: err.stack
	});
});

module.exports = router;
