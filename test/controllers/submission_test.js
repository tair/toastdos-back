'use strict';

const chai = require('chai');
chai.use(require('chai-http'));

const server = require('../../app/index');
const auth   = require('../../app/lib/authentication');
const knex   = require('../../app/lib/bookshelf').knex;

const testdata = require('../../seeds/test/test_data.json');

describe('Submission Controller', function() {

	let testToken = '';

	// Make a token so tests can authenticate
	before('Generate test JWT', function (done) {
		let authenticatedUser = testdata.users[0];
		auth.signToken({user_id: authenticatedUser.id}, (err, newToken) => {
			chai.expect(err).to.be.null;
			testToken = newToken;
			done();
		});
	});

	before('Setup SQLite memory database', function () {
		return knex.migrate.latest();
	});

	beforeEach('Populate SQLite memory DB with fresh test data', function () {
		return knex.seed.run();
	});

	describe('POST /api/submission/', function() {

		it('Empty or non-existent gene list responds with error');

		it('Empty or non-existent annotation list responds with error');

		it('Malformed gene responds with error');

		it('Malformed annotation responds with error');

		it('Malformed (non DOI or Pubmed) publication id responds with error');

		it('Submitter id must match authenticated user');

		it('An error in the submission process rolls back entire transaction');

		it('Well-formed submission request responds with success');

	});

});