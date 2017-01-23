'use strict';

const chai = require('chai');
chai.use(require('chai-http'));

const server = require('../app');
const auth   = require('../app/lib/authentication');
const knex   = require('../app/lib/bookshelf').knex;

const testdata = require('../seeds/test_data.json');

describe('Authentication middleware', function() {

	let testToken = '';

	// Make a token so tests can authenticate
	before('Generate test JWT', function(done) {
		let authenticatedUser = testdata.users[0];
		auth.signToken({user_id: authenticatedUser.id}, (err, newToken) => {
			chai.expect(err).to.be.null;
			testToken = newToken;
			done();
		});
	});

	before('Setup SQLite memory database', function() {
		return knex.migrate.latest();
	});

	beforeEach('Populate SQLite memory DB with fresh test data', function() {
		return knex.seed.run();
	});

	describe('JWT basic authentication', function() {

		it('A well formed authentication header is accepted', function(done) {
			let testUser = testdata.users[0];
			chai.request(server)
				.get('/api/user/' + testUser.id)
				.set({Authorization: 'Bearer ' + testToken})
				.end((err, res) => {
					chai.expect(res.status).to.equal(200);
					done();
				});
		});

		it('Omitting a header for an authenticated request responds with an error', function(done) {
			let testUser = testdata.users[0];
			chai.request(server)
				.get('/api/user/' + testUser.id)
				.end((err, res) => {
					chai.expect(res.status).to.equal(401);
					chai.expect(res.body.error).to.equal('Unauthorized');
					done();
				});
		});

		it('A JSON Web Token must be used for authentication', function(done) {
			let testUser = testdata.users[0];
			chai.request(server)
				.get('/api/user/' + testUser.id)
				.set({Authorization: 'Some crap that isnt a token'})
				.end((err, res) => {
					chai.expect(res.status).to.equal(401);
					chai.expect(res.body.error).to.equal('Unauthorized');
					done();
				});
		});

		it('Expired tokens are rejected', function(done) {
			let testUser = testdata.users[0];
			auth.signToken({
				exp: 0,
				data: {user_id: testUser.id}
			}, (tokenerr, token) => {
				chai.request(server)
					.get('/api/user/' + testUser.id)
					.set({Authorization: 'Bearer ' + token})
					.end((err, res) => {
						chai.expect(res.status).to.equal(401);
						chai.expect(res.body.error).to.equal('TokenExpired');
						chai.expect(res.body.message).to.equal('jwt expired');
						done();
					});
			});
		});

		it('Malformed tokens are rejected', function(done) {
			let testUser = testdata.users[0];
			chai.request(server)
				.get('/api/user/' + testUser.id)
				.set({Authorization: 'Bearer garbagetoken'})
				.end((err, res) => {
					chai.expect(res.status).to.equal(401);
					chai.expect(res.body.error).to.equal('JsonWebTokenError');
					chai.expect(res.body.message).to.equal('jwt malformed');
					done();
				});
		});

	});

	describe('User authentication', function() {

		it('Successfully retrieves user whose ID matches ID in JWT', function(done) {
			let testUser = testdata.users[0];
			chai.request(server)
				.get('/api/user/' + testUser.id)
				.set({Authorization: 'Bearer ' + testToken})
				.end((err, res) => {
					chai.expect(res.status).to.equal(200);
					chai.expect(res.body).to.contain(testUser);
					done();
				});
		});

		it('Cannot retrieve a user whose ID doesnt match ID in JWT', function(done) {
			let testUser = testdata.users[0];
			auth.signToken({user_id: 'fakeid'}, (tokenerr, token) => {
				chai.request(server)
					.get('/api/user/' + testUser.id)
					.set({Authorization: 'Bearer ' + token})
					.end((err, res) => {
						chai.expect(res.status).to.equal(401);
						done();
					});
			});
		});

	});

});
