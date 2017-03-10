'use strict';

const chai = require('chai');
chai.use(require('chai-http'));
chai.use(require('chai-subset'));

const server = require('../../app/index');
const auth   = require('../../app/lib/authentication');
const knex   = require('../../app/lib/bookshelf').knex;

const Publication      = require('../../app/models/publication');
const LocusName        = require('../../app/models/locus_name');
const Role             = require('../../app/models/role');
const User             = require('../../app/models/user');
const Annotation       = require('../../app/models/annotation');
const AnnotationStatus = require('../../app/models/annotation_status');

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

		// Tests will modify this as needed
		this.currentTest.submission = {
			publicationId: '10.1234/thing.anotherthing',
			submitterId: testdata.users[0].id,
			genes: [
				{
					locusName: 'AT1G10000',
					geneSymbol: 'RIB',
					fullName: 'Ribonuclease H-like thing'
				},
				{
					locusName: 'URS00000EF184',
					geneSymbol: 'SNF',
					fullName: 'Some new fullname'
				}
			],
			annotations: [
				{
					type: 'COMMENT',
					data: {
						locusName: 'AT1G10000',
						text: 'Description of something'
					}
				},
				{
					type: 'PROTEIN_INTERACTION',
					data: {
						locusName: 'AT1G10000',
						locusName2: 'URS00000EF184',
						method: {
							id: testdata.keywords[0].id
						}
					}
				},
				{
					type: 'MOLECULAR_FUNCTION',
					data: {
						locusName: 'AT1G10000',
						method: {
							id: testdata.keywords[0].id
						},
						keyword: {
							name: 'New keyword'
						},
						evidence: 'URS00000EF184'
					}
				},
			]
		};
		return knex.seed.run();
	});

	describe('POST /api/submission/', function() {

		it('Empty or non-existent gene list responds with error', function(done) {
			this.test.submission.genes = [];

			chai.request(server)
				.post('/api/submission/')
				.send(this.test.submission)
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(res.status).to.equal(400);
					chai.expect(res.text).to.equal('No genes specified');
					done();
				});
		});

		it('Empty or non-existent annotation list responds with error', function(done) {
			this.test.submission.annotations = [];

			chai.request(server)
				.post('/api/submission/')
				.send(this.test.submission)
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(res.status).to.equal(400);
					chai.expect(res.text).to.equal('No annotations specified');
					done();
				});
		});

		it('Malformed gene responds with error', function(done) {
			delete this.test.submission.genes[0].locusName;

			chai.request(server)
				.post('/api/submission/')
				.send(this.test.submission)
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(res.status).to.equal(400);
					chai.expect(res.text).to.equal('Body contained malformed Gene data');
					done();
				});
		});

		it('Malformed annotation responds with error', function(done) {
			delete this.test.submission.annotations[0].data;

			chai.request(server)
				.post('/api/submission/')
				.send(this.test.submission)
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(res.status).to.equal(400);
					chai.expect(res.text).to.equal('Body contained malformed Annotation data');
					done();
				});
		});

		it('Malformed (non DOI or Pubmed) publication id responds with error', function(done) {
			const badPubId = 'Nonsense';
			this.test.submission.publicationId = badPubId;

			chai.request(server)
				.post('/api/submission/')
				.send(this.test.submission)
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(res.status).to.equal(400);
					chai.expect(res.text).to.equal(`${badPubId} is not a DOI or Pubmed ID`);
					done();
				});
		});

		it('Submitter id must match authenticated user', function(done) {
			const nonMatchingUser = testdata.users[1];
			this.test.submission.submitterId = nonMatchingUser.id;

			chai.request(server)
				.post('/api/submission/')
				.send(this.test.submission)
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(res.status).to.equal(401);
					chai.expect(res.text).to.equal('submitterId does not match authenticated user');
					done();
				});
		});

		it('An error in the submission process rolls back entire transaction', function(done) {
			this.test.submission.annotations[1].data.locusName = 'Bad thing';

			chai.request(server)
				.post('/api/submission/')
				.send(this.test.submission)
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(res.status).to.equal(400);

					// If the transaction rolled back, none of these records should exist
					let sub = this.test.submission;
					Promise.all([
						Publication.where({doi: sub.publicationId}).fetch(),
						LocusName.where({locus_name: sub.genes[0].locusName}).fetch()
					]).then(resultArray => {
						resultArray.forEach(result => chai.expect(result).to.not.exist);
						done();
					});
				});
		});

		it('Well-formed submission request responds with success', function(done) {
			this.timeout(5000);
			chai.request(server)
				.post('/api/submission/')
				.send(this.test.submission)
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(res.status).to.equal(201);
					done();
				});
		});

	});

	describe('GET /api/submission/', function() {

		beforeEach('Generate curator and token', function() {
			// Add the Curator role to the authenticated user to access this endpoint
			return Role.where({name: 'Curator'}).fetch().then(curatorRole => {
				return User.where({id: testdata.users[0].id}).fetch().then(user => {
					return user.roles().attach(curatorRole);
				});
			});
		});

		it('Default sort is by ascending date', function(done) {

			// There's also a secondary sort by publication ID
			let expectedSubmissions = [
				{
					document: '10.1594/GFZ.GEOFON.gfz2009kciu',
					total: 2,
					pending: 1,
					submission_date: '2017-03-10'
				},
				{
					document: '999999',
					total: 3,
					pending: 1,
					submission_date: '2017-03-10'
				},
				{
					document: '999999',
					total: 1,
					pending: 0,
					submission_date: '2017-03-09'
				}
			];

			// Set some Annotation statuses to 'pending'
			const testAnn1 = testdata.annotations[5];
			const testAnn2 = testdata.annotations[0];

			AnnotationStatus.where({name: 'pending'}).fetch().then(status => {
				return Annotation
					.where('id', 'in', [testAnn1.id, testAnn2.id])
					.save({status_id: status.get('id')}, {patch: true});
			}).then(() => {
				chai.request(server)
					.get('/api/submission/')
					.set({Authorization: `Bearer ${testToken}`})
					.end((err, res) => {
						chai.expect(res.status).to.equal(200);
						chai.expect(res.body).to.containSubset(expectedSubmissions);
						done();
					});
			});
		});

	});

});