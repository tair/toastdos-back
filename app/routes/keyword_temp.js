'use strict';

const keywordTempController = require('../controllers/keyword_temp');

const authenticationMiddleware = require('../middleware/authentication');

const express = require('express');
let router = express.Router();

// GET temp keyword by id
router.get(
    '/',
    authenticationMiddleware.validateAuthentication,
    keywordTempController.getAllKeywordTemps
);

// GET temp keyword by id
// router.get(
//     '/:id',
//     authenticationMiddleware.validateAuthentication,
//     keywordTempController.getKeywordTempById
// );

// POST new temp keyword
// router.post(
//     '/',
//     authenticationMiddleware.validateAuthentication,
//     keywordTempController.createKeywordTemp
// );

// DELETE temp keyword by id
// router.delete(
//     '/:id',
//     authenticationMiddleware.validateAuthentication,
//     keywordTempController.deleteKeywordTemp
// );

module.exports = router;