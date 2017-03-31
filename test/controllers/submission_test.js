'use strict';

const chai = require('chai');
chai.use(require('chai-http'));
chai.use(require('chai-subset'));
const _    = require('lodash');

const server = require('../../app/index');
const auth   = require('../../app/lib/authentication');
const knex   = require('../../app/lib/bookshelf').knex;

const Publication      = require('../../app/models/publication');
const LocusName        = require('../../app/models/locus_name');
const Role             = require('../../app/models/role');
const User             = require('../../app/models/user');
const Annotation       = require('../../app/models/annotation');
const AnnotationStatus = require('../../app/models/annotation_status');
const Keyword          = require('../../app/models/keyword');

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

	beforeEach('Set up submission test data', function() {
		// Tests will modify this as needed
		this.currentTest.submission = {
			publicationId: '10.1234/thing.anotherthing',
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
				{
					type: 'MOLECULAR_FUNCTION',
					data: {
						locusName: 'AT1G10000',
						method: {
							name: 'New keyword 2'
						},
						keyword: {
							name: 'New keyword'
						},
						evidence: 'URS00000EF184'
					}
				}
			]
		};

		// Add the Curator role to the authenticated user to access this endpoint
		return Role.where({name: 'Curator'}).fetch().then(curatorRole => {
			return User.where({id: testdata.users[0].id}).fetch().then(user => {
				return user.roles().attach(curatorRole);
			});
		});
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

		it('Annotation with invalid type is rejected', function(done) {
			const badType = 'Bad Type Name';
			this.test.submission.annotations[0].type = badType;

			chai.request(server)
				.post('/api/submission/')
				.send(this.test.submission)
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(res.status).to.equal(400);
					chai.expect(res.text).to.equal(`Invalid annotation type ${badType}`);
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

		it('Only one Keyword record is created when two annotations try to add the same new Keyword', function(done) {
			this.timeout(5000);
			chai.request(server)
				.post('/api/submission/')
				.send(this.test.submission)
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(res.status).to.equal(201);

					Keyword
						.where({name: this.test.submission.annotations[2].data.keyword.name})
						.fetchAll()
						.then(keyword => {
							chai.expect(keyword).to.have.length(1);
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

		it('Annotations created in submission reference created gene symbols', function(done) {
			this.timeout(5000);

			const testGene = this.test.submission.genes[0];

			chai.request(server)
				.post('/api/submission/')
				.send(this.test.submission)
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(err).to.not.exist;

					// Use a combination of fields to uniquely identify an annotation we just created
					Annotation
						.where({annotation_format: 'comment_annotation'})
						.orderBy('created_at', 'DESC')
						.fetch({withRelated: 'locusSymbol'})
						.then(createdAnnotation => {
							let geneSymbol = createdAnnotation.related('locusSymbol');
							chai.expect(geneSymbol.get('symbol')).to.equal(testGene.geneSymbol);
							chai.expect(geneSymbol.get('full_name')).to.equal(testGene.fullName);
							done();
						});
				});
		});

	});

	describe('GET /api/submission/list/', function() {

		it('Default sort is by ascending date', function(done) {

			// There's also a secondary sort by publication ID
			let expectedSubmissions = [
				{
					document: testdata.publications[0].doi,
					total: 2,
					pending: 1,
					submission_date: testdata.annotations[0].created_at.split(' ')[0]
				},
				{
					document: testdata.publications[1].pubmed_id,
					total: 3,
					pending: 1,
					submission_date: testdata.annotations[3].created_at.split(' ')[0]
				},
				{
					document: testdata.publications[1].pubmed_id,
					total: 1,
					pending: 0,
					submission_date: testdata.annotations[2].created_at.split(' ')[0]
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
					.get('/api/submission/list/')
					.set({Authorization: `Bearer ${testToken}`})
					.end((err, res) => {
						chai.expect(res.status).to.equal(200);
						chai.expect(res.body).to.containSubset(expectedSubmissions);
						done();
					});
			});
		});

		it('Single submissions return as a proper array', function(done) {
			const expectedSubmission = {
				document: testdata.publications[0].doi,
				total: 1,
				pending: 0,
				submission_date: testdata.annotations[0].created_at.split(' ')[0]
			};

			// Ensure there's only one Annotation
			Annotation.where('id', '!=', 1).destroy().then(() => {
				chai.request(server)
					.get('/api/submission/list/')
					.set({Authorization: `Bearer ${testToken}`})
					.end((err, res) => {
						chai.expect(res.status).to.equal(200);
						chai.expect(res.body).to.contain(expectedSubmission);
						done();
					});
			});
		});

		it('Pagination defaults correctly if not provided', function(done) {
			const expectedLength = 20;
			const expectedSubmission = {
				submission_date: testdata.annotations[0].created_at.split(' ')[0],
				pending: 0,
				total: 1,
				document: testdata.publications[0].doi
			};

			// Add annotations with incremental dates to make the list paginate
			const fakeAnnotation = Object.assign({}, testdata.annotations[0]);
			delete fakeAnnotation.id;
			delete fakeAnnotation.created_at;

			let annotationPromises = _.range(expectedLength - 1).map(x => {
				let date = new Date();
				date.setDate(date.getDate() + x);

				fakeAnnotation.created_at = date.toISOString().substring(0, 10);
				return Annotation.forge(fakeAnnotation).save();
			});

			Promise.all(annotationPromises).then(() => {
				chai.request(server)
					.get('/api/submission/list/')
					.set({Authorization: `Bearer ${testToken}`})
					.end((err, res) => {
						chai.expect(res.status).to.equal(200);
						chai.expect(res.body).to.have.lengthOf(expectedLength);
						chai.expect(res.body[expectedLength - 1]).to.deep.equal(expectedSubmission);
						done();
					});
			});
		});

		it('Pagination matches provided values', function(done) {
			const expectedLength = 5;
			const testPage = 3;
			const expectedSubmission = {
				submission_date: testdata.annotations[0].created_at.split(' ')[0],
				pending: 0,
				total: 1,
				document: testdata.publications[0].doi
			};

			// Add annotations with incremental dates to make the list paginate
			const fakeAnnotation = Object.assign({}, testdata.annotations[0]);
			delete fakeAnnotation.id;
			delete fakeAnnotation.created_at;

			let annotationPromises = _.range(expectedLength * testPage - 1).map(x => {
				let date = new Date();
				date.setDate(date.getDate() + x);

				fakeAnnotation.created_at = date.toISOString().substring(0, 10);
				return Annotation.forge(fakeAnnotation).save();
			});

			Promise.all(annotationPromises).then(() => {
				chai.request(server)
					.get(`/api/submission/list?limit=${expectedLength}&page=${testPage}`)
					.set({Authorization: `Bearer ${testToken}`})
					.end((err, res) => {
						chai.expect(res.status).to.equal(200);
						chai.expect(res.body).to.have.lengthOf(expectedLength);
						chai.expect(res.body[expectedLength - 1]).to.deep.equal(expectedSubmission);
						done();
					});
			});
		});

	});

	describe('GET /api/submission', function() {

		it('Invalid submitter ID responds with error');

		it('Invalid publication ID responds with error');

		it('Malformed date responds with error');

		it('Submission is returned with all proper data');

	});

});
