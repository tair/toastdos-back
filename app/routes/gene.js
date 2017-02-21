'use strict';

const geneController = require('../controllers/gene');

const express = require('express');
let router = express.Router();

router.get('/verify/:name', geneController.getByLocusName);

module.exports = router;

/*
Eventually going to want the following:

Fuzzy match on name
Search by full name
Search by ID


 /api/gene/id/:id
 /api/gene/name/:name
 /api/gene/search?query={query}
 /api/gene/search?query={query}&onlyUniprot
 /api/gene/search?query={query}&onlyRNACentral

 */