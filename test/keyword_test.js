"use strict";

const chai = require('chai');
chai.use(require('chai-http'));

const server = require('../app');
const knex    = require('../app/lib/bookshelf').knex;

const testdata = require('../seeds/test_data.json');

describe('Keyword Controller', function() {

	before('Setup SQLite memory database', function() {
		return knex.migrate.latest();
	});

	beforeEach('Populate SQLite memory DB with fresh test data', function() {
		return knex.seed.run();
	});

	describe('POST /api/keyword/search', function(done) {

		it('Search is not performed with too few characters');

		it('Number of search results is limited');

		it('Only alphanumeric queries are accepted');

		it('Search result filtered by provided KeywordType');

		it('Well-formed search responds with correct data');

	});

});
