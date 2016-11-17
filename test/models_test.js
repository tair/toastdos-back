"use strict";

const chai = require('chai');
const knex = require('../app/lib/bookshelf').knex;

const KeywordType = require('../app/models/keyword_type');
const Keyword = require('../app/models/keyword');

const testdata = require('../seeds/test_data.json');

describe('Models', function() {

	before(function(done) {
		// Give us fresh test data in a sqlite memory database for each test
		knex.migrate.latest()
			.then(() => knex.seed.run())
			.then(() => done());
	});

	describe('Keyword', function() {
		it('Get keyword type', function() {

		});

	});


});
