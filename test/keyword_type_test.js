"use strict";

const chai = require('chai');
chai.use(require('chai-http'));

const server = require('../app');
const auth   = require('../app/lib/authentication');
const knex    = require('../app/lib/bookshelf').knex;

const testdata = require('../seeds/test_data.json');

describe('KeywordType Controller', function() {

	before('Setup SQLite memory database', function() {
		return knex.migrate.latest();
	});

	beforeEach('Populate SQLite memory DB with fresh test data', function() {
		return knex.seed.run();
	});

	it('Successfully retrieves all KeywordTypes in the database');

});
