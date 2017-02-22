'use strict';

const chai = require('chai');
chai.use(require('chai-http'));
chai.use(require('chai-subset'));

const server = require('../../app/index');
const knex    = require('../../app/lib/bookshelf').knex;
const Draft= require('../../app/models/draft');

const testdata = require('../../seeds/test_data.json');

describe.only('Draft Controller', function() {

	before('Setup SQLite memory database', function() {
		return knex.migrate.latest();
	});

	beforeEach('Populate SQLite memory DB with fresh test data', function() {
		return knex.seed.run();
	});

	describe('POST /api/draft/', function() {

		it('Draft was successfully created', function(done) {
			const testSubmitterId = testdata.draft[1].submitter_id;
			const testWipState = testdata.draft[1].wip_state;
			const expectedObj=testdata.draft[1];

			chai.request(server)
				.post('/api/draft')
				.send({
					submitter_id: testSubmitterId,
					wip_state: testWipState
				})
				.end((err,res) => {
					chai.expect(res.status).to.equal(201);
					console.log(res.body);
					console.log(testWipState);
					chai.expect(res.body).to.containSubset(expectedObj);
					done();
				});
		});

		it('submitter_id is missing', function(done) {
			const testWipState = testdata.draft[0].wip_state;

			chai.request(server)
				.post('/api/draft')
				.send({
					wip_state: testWipState
				})
				.end((err,res) => {
					chai.expect(res.status).to.equal(400);
					chai.expect(res.text).to.equal(`submitter_id is missing`);
					done();
				});
		});

		it('submitter_id is invalid', function(done) {
			const testSubmitterId = 5;
			const testWipState = testdata.draft[0].wip_state;

			chai.request(server)
				.post('/api/draft')
				.send({
					submitter_id: testSubmitterId,
					wip_state: testWipState
				})
				.end((err,res) => {
					chai.expect(res.status).to.equal(400);
					chai.expect(res.text).to.equal(`submitter_id is invalid ${testSubmitterId}`);
					done();
				});
		});

		it('wip_state is missing', function(done) {
			const testSubmitterId = testdata.draft[0].submitter_id;

			chai.request(server)
				.post('/api/draft')
				.send({
					submitter_id: testSubmitterId
				})
				.end((err,res) => {
					chai.expect(res.status).to.equal(400);
					chai.expect(res.text).to.equal(`Draft (wip state) is missing or invalid`);
					done();
				});
		});

	});

});
