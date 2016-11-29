"use strict";

const _    = require('lodash');
const chai = require('chai');
chai.use(require('chai-http'));

const server = require('../app');
const knex   = require('../app/lib/bookshelf').knex;

const testdata = require('../seeds/test_data.json');

describe('User Controller', function() {

	// Make sure the database is up to date
	before(function() { return knex.migrate.latest() });

	// Populate sqlite memory DB with fresh test data
	beforeEach(function() { return knex.seed.run() });

	describe('PUT /api/user/:id', function() {

		it('User is updated correctly', function(done) {
			let expectedEmail = 'updated.email@test.com';

			let testUser = testdata.users[0];
			testUser.email_address = testUser;

			chai.request(server)
				.put('/api/user/' + testUser.id)
				.send({email_address: expectedEmail})
				.end((err, res) => {
					if (err) throw res.body;

					chai.expect(res.status).to.equal(200);
					chai.expect(res.body.email_address).to.equal(expectedEmail);
					done();
				});
		});

		it('Trying to update disallowed fields returns an error', function(done) {
			let testUser = testdata.users[0];
			let invalidUpdateRequest = {
				invalid: 'field',
				another: 'bad field'
			};

			chai.request(server)
				.put('/api/user/' + testUser.id)
				.send(invalidUpdateRequest)
				.end((err, res) => {
					chai.expect(res.status).to.equal(400);
					chai.expect(res.body.message).to.contain(Object.keys(invalidUpdateRequest).toString());
					done();
				});
		});

		it('Trying to update a non-existent User returns an error');

	});

});
