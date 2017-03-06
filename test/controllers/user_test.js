'use strict';

const chai = require('chai');
chai.use(require('chai-http'));

const server = require('../../app/index');
const auth   = require('../../app/lib/authentication');
const knex    = require('../../app/lib/bookshelf').knex;

const testdata = require('../../seeds/test_data.json');

describe('User Controller', function() {

	let testToken = '';

	before('Generate test JWT', function(done) {
		let authenticatedUser = testdata.users[0];
		auth.signToken({user_id: authenticatedUser.id}, (err, token) => {
			chai.expect(err).to.be.null;
			testToken = token;
			done();
		});
	});

	before('Setup SQLite memory database', function() {
		return knex.migrate.latest();
	});

	beforeEach('Populate SQLite memory DB with fresh test data', function() {
		return knex.seed.run();
	});


	describe('GET /api/user/:id', function() {

		it('Properly gets existing user by ID', function(done) {
			let testUser = testdata.users[0];

			chai.request(server)
				.get(`/api/user/${testUser.id}`)
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(res.status).to.equal(200);
					chai.expect(res.body).to.contain(testUser);
					done();
				});
		});

		it('Trying to get a non-existing user responds with an error', function(done) {
			let fakeId = 999;
			auth.signToken({user_id: fakeId}, (tokenerr, token) => {
				chai.request(server)
					.get(`/api/user/${fakeId}`)
					.set({Authorization: `Bearer ${token}`})
					.end((err, res) => {
						chai.expect(res.status).to.equal(401);
						done();
					});
			});
		});

		it('Cannot get user without valid authentication', function(done) {
			let testUser = testdata.users[0];
			chai.request(server)
				.get(`/api/user/${testUser.id}`)
				.set({Authorization: 'Bearer invalidtoken'})
				.end((err, res) => {
					chai.expect(res.status).to.equal(401);
					done();
				});
		});

	});

	describe('PUT /api/user/:id', function() {

		it('User is updated correctly', function(done) {
			let expectedEmail = 'updated.email@test.com';

			let testUser = testdata.users[0];

			chai.request(server)
				.put(`/api/user/${testUser.id}`)
				.send({email_address: expectedEmail})
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					if (err) throw res.body;

					chai.expect(res.status).to.equal(200);
					chai.expect(res.body.email_address).to.equal(expectedEmail);
					chai.expect(res.body).to.contain.keys('id', 'email_address', 'name', 'created_at', 'orcid_id');
					done();
				});
		});

		it('Trying to update disallowed fields responds with an error', function(done) {
			let testUser = testdata.users[0];
			let invalidUpdateRequest = {
				invalid: 'field',
				another: 'bad field'
			};

			chai.request(server)
				.put(`/api/user/${testUser.id}`)
				.send(invalidUpdateRequest)
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(res.status).to.equal(400);
					chai.expect(res.text).to.contain(Object.keys(invalidUpdateRequest).toString());
					done();
				});
		});

		it('Trying to update a non-existent User responds with an error', function(done) {
			let fakeId = 999;
			auth.signToken({user_id: fakeId}, (tokenerr, token) => {
				chai.request(server)
					.put(`/api/user/${fakeId}`)
					.send({email_address: 'fake.email@email.com'})
					.set({Authorization: `Bearer ${token}`})
					.end((err, res) => {
						chai.expect(res.status).to.equal(401);
						done();
					});
			});
		});

		it('Supplying an invalid emails responds with an error', function(done) {
			chai.request(server)
				.put('/api/user/1')
				.send({email_address: 'malformed.email'})
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(res.status).to.equal(400);
					chai.expect(res.text).to.contain('Malformed email');
					done();
				});
		});

		it('Cannot update user without valid authentication', function(done) {
			let testUser = testdata.users[0];
			chai.request(server)
				.put(`/api/user/${testUser.id}`)
				.set({Authorization: 'Bearer invalidtoken'})
				.send({email_address: 'new.email@test.com'})
				.end((err, res) => {
					chai.expect(res.status).to.equal(401);
					done();
				});
		});

	});

});
