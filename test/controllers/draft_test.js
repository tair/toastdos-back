'use strict';

const chai = require('chai');
chai.use(require('chai-http'));
chai.use(require('chai-subset'));

const server = require('../../app/index');
const auth   = require('../../app/lib/authentication');
const knex    = require('../../app/lib/bookshelf').knex;

const testdata = require('../../seeds/test/test_data.json');

describe.only('Draft Controller', function() {

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

	describe('GET /api/draft/:id', function() {

		it('Properly gets drafts for authenticated user', function(done) {
			let testDraft = testdata.draft[0];
			chai.request(server)
				.get('/api/draft/')
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(res.status).to.equal(200);
					chai.expect(res.body).to.containSubset(testDraft);
					done();
				});
		});

	});

	describe('POST /api/draft/', function() {

		it('Draft was successfully created', function(done) {
			const testDraft = testdata.draft[0];

			chai.request(server)
				.post('/api/draft')
				.set({Authorization: `Bearer ${testToken}`})
				.send({wip_state: testDraft.wip_state})
				.end((err, res) => {
					chai.expect(res.status).to.equal(201);

					// Need to parse body to simulate GET endpoint
					res.body.wip_state = JSON.parse(res.body.wip_state);

					chai.expect(res.body).to.containSubset(testDraft);
					done();
				});
		});

		it('wip_state is missing', function(done) {

			chai.request(server)
				.post('/api/draft')
				.set({Authorization: `Bearer ${testToken}`})
				.end((err,res) => {
					chai.expect(res.status).to.equal(400);
					chai.expect(res.text).to.equal('Draft (wip state) is missing or invalid');
					done();
				});
		});

	});

});
