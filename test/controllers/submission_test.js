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
const Submission       = require('../../app/models/submission');

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

		it('Well-formed submission request makes correct records', function(done) {
			this.timeout(5000);
			chai.request(server)
				.post('/api/submission/')
				.send(this.test.submission)
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(res.status).to.equal(201);

					// Fetch the submission we just created
					const newSubId = testdata.submission.length + 1;
					Submission
						.where({id: newSubId})
						.fetch({withRelated: ['submitter', 'publication', 'annotations']})
						.then(submission => {
							chai.expect(submission.related('submitter').get('id')).to.equal(testdata.users[0].id);
							chai.expect(submission.related('publication').get('doi')).to.equal(this.test.submission.publicationId);
							chai.expect(submission.related('annotations').size()).to.equal(this.test.submission.annotations.length);

							done();
						});
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

		it('GeneSymbol should be optional', function(done) {
			const testGene1 = this.test.submission.genes[0];
			const testGene2 = this.test.submission.genes[1];

			delete testGene1.geneSymbol;
			delete testGene2.geneSymbol;
			delete testGene2.fullName;

			chai.request(server)
				.post('/api/submission/')
				.send(this.test.submission)
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(res.status).to.equal(201);

					let locusPromise1 = LocusName
						.where('locus_name', testGene1.locusName)
						.fetch({withRelated: 'locus.symbols'});

					let locusPromise2 = LocusName
						.where('locus_name', testGene2.locusName)
						.fetch({withRelated: 'locus.symbols'});

					Promise.all([locusPromise1, locusPromise2]).then(([locus1, locus2]) => {
						let symbol1 = locus1.related('locus').related('symbols').first();
						let symbol2 = locus2.related('locus').related('symbols').first();

						chai.expect(symbol1.get('full_name')).to.equal(testGene1.fullName);
						chai.expect(symbol1.get('symbol')).to.not.exist;
						chai.expect(symbol2).to.not.exist;

						done();
					});
				});
		});

	});

	describe('GET /api/submission/list/', function() {

		it('Default sort is by descending date', function(done) {
			// Set some Annotation statuses to 'pending'
			const testAnn1 = testdata.annotations[5];
			const testAnn2 = testdata.annotations[0];

			// Make some annotations pending
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
						chai.expect(res.body[0].submission_date).to.be.above(res.body[1].submission_date);
						chai.expect(res.body[1].submission_date).to.be.above(res.body[2].submission_date);
						done();
					});
			});
		});

		it('Single submissions return as a proper array', function(done) {
			const expectedSubmission = {
				total: 2,
				pending: 0,
				document: testdata.publications[0].doi,
				submission_date: new Date(testdata.submission[0].created_at).toISOString()
			};

			// Ensure there's only one Submission
			Annotation.where('submission_id', '!=', 1).destroy().then(() => {
				return Submission.where('id', '!=', 1).destroy();
			}).then(() => {
				chai.request(server)
					.get('/api/submission/list/')
					.set({Authorization: `Bearer ${testToken}`})
					.end((err, res) => {
						chai.expect(res.status).to.equal(200);
						chai.expect(res.body).to.be.an.array;
						chai.expect(res.body).to.have.lengthOf(1);
						chai.expect(res.body[0]).to.contain(expectedSubmission);
						done();
					});
			});
		});

		it('Pagination defaults correctly if not provided', function(done) {
			const expectedLength = 20;
			const expectedSubmission = {
				pending: 0,
				total: 3,
				document: testdata.publications[1].pubmed_id,
				submission_date: new Date(testdata.submission[2].created_at).toISOString()
			};

			// Add enough Submissions to make the list paginate.
			const fakeAnnotation = Object.assign({}, testdata.annotations[0]);
			delete fakeAnnotation.id;
			delete fakeAnnotation.created_at;
			delete fakeAnnotation.submission_id;

			// Add submissions with newer dates than test data so that
			// the last submission in the list is one of our testdata submissions.
			let submissionPromises = _.range(expectedLength - 1).map(x => {
				let date = new Date();
				date.setDate(date.getDate() + x);
				let sqlTimestamp = date.toISOString().substring(0, 10);

				return Submission.addNew({
					publication_id: fakeAnnotation.publication_id,
					submitter_id: fakeAnnotation.submitter_id,
					created_at: sqlTimestamp
				}).then(submission => {
					fakeAnnotation.created_at = sqlTimestamp;
					fakeAnnotation.submission_id = submission.get('id');
					return Annotation.forge(fakeAnnotation).save();
				});
			});

			Promise.all(submissionPromises).then(() => {
				chai.request(server)
					.get('/api/submission/list/')
					.set({Authorization: `Bearer ${testToken}`})
					.end((err, res) => {
						chai.expect(res.status).to.equal(200);
						chai.expect(res.body).to.have.lengthOf(expectedLength);
						chai.expect(res.body[expectedLength - 1]).to.contain(expectedSubmission);
						done();
					});
			});
		});

		it('Pagination matches provided values', function(done) {
			const expectedLength = 5;
			const testPage = 3;
			const expectedSubmission = {
				pending: 0,
				total: 3,
				document: testdata.publications[1].pubmed_id,
				submission_date: new Date(testdata.submission[2].created_at).toISOString()
			};

			// Add Submissions with incremental dates to make the list paginate
			const fakeAnnotation = Object.assign({}, testdata.annotations[0]);
			delete fakeAnnotation.id;
			delete fakeAnnotation.created_at;
			delete fakeAnnotation.submission_id;

			// Adding this many will put one of our test Submissions at the end of page 2
			let submissionPromises = _.range(expectedLength * testPage - 1).map(x => {
				let date = new Date();
				date.setDate(date.getDate() + x);
				let sqlTimestamp = date.toISOString().substring(0, 19).replace('T', ' ');

				return Submission.addNew({
					publication_id: fakeAnnotation.publication_id,
					submitter_id: fakeAnnotation.submitter_id,
					created_at: sqlTimestamp
				}).then(submission => {
					fakeAnnotation.created_at = sqlTimestamp;
					fakeAnnotation.submission_id = submission.get('id');
					return Annotation.forge(fakeAnnotation).save();
				})
			});

			Promise.all(submissionPromises).then(() => {
				chai.request(server)
					.get(`/api/submission/list?limit=${expectedLength}&page=${testPage}`)
					.set({Authorization: `Bearer ${testToken}`})
					.end((err, res) => {
						chai.expect(res.status).to.equal(200);
						chai.expect(res.body).to.have.lengthOf(expectedLength);
						chai.expect(res.body[expectedLength - 1]).to.contain(expectedSubmission);
						done();
					});
			});
		});

	});

	describe('GET /api/submission/:id', function() {

		it('Invalid ID responds with error', function(done) {
			const badId = 999;
			chai.request(server)
				.get(`/api/submission/${badId}`)
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(res.status).to.equal(404);
					chai.expect(res.text).to.equal(`No submission with ID ${badId}`);
					done();
				});
		});

		it('Gene Term Annotations are properly handled', function(done) {
			const testSubmission = testdata.submission[0];
			const expectedSubmission = {
				id: testSubmission.id,
				publicationId: testdata.publications[0].doi,
				genes: [
					{
						id: testdata.locus[0].id,
						locusName: testdata.locus_name[0].locus_name,
						geneSymbol: testdata.gene_symbol[0].symbol,
						fullName: testdata.gene_symbol[0].full_name
					}
				],
				annotations: [
					{
						id: testdata.annotations[0].id,
						type: testdata.annotation_types[0].name,
						data: {
							locusName: testdata.locus_name[0].locus_name,
							method: {
								id: testdata.keywords[0].id,
								name: testdata.keywords[0].name
							},
							keyword: {
								id: testdata.keywords[1].id,
								name: testdata.keywords[1].name
							},
							evidence: testdata.locus_name[0].locus_name,
						}
					},
					{
						id: testdata.annotations[1].id,
						type: testdata.annotation_types[1].name,
						data: {
							locusName: testdata.locus_name[0].locus_name,
							method: {
								id: testdata.keywords[0].id,
								name: testdata.keywords[0].name
							},
							keyword: {
								id: testdata.keywords[1].id,
								name: testdata.keywords[1].name
							},
						}
					}
				]
			};

			chai.request(server)
				.get(`/api/submission/${testSubmission.id}`)
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(res.status).to.equal(200);
					chai.expect(res.body).to.containSubset(expectedSubmission);
					done();
				});
		});

		it('GeneGene and Comment Annotations are properly handled', function(done) {
			const testSubmission = testdata.submission[2];
			const expectedSubmission = {
				id: testSubmission.id,
				publicationId: testdata.publications[1].pubmed_id,
				genes: [
					{
						id: testdata.locus[2].id,
						locusName: testdata.locus_name[5].locus_name,
						geneSymbol: testdata.gene_symbol[0].symbol,
						fullName: testdata.gene_symbol[0].full_name
					},
					{
						id: testdata.locus[1].id,
						locusName: testdata.locus_name[1].locus_name,
						geneSymbol: testdata.gene_symbol[0].symbol,
						fullName: testdata.gene_symbol[0].full_name
					},
					{
						id: testdata.locus[3].id,
						locusName: testdata.locus_name[4].locus_name,
						geneSymbol: testdata.gene_symbol[0].symbol,
						fullName: testdata.gene_symbol[0].full_name
					}
				],
				annotations: [
					{
						id: testdata.annotations[3].id,
						type: testdata.annotation_types[0].name,
						data: {
							locusName: testdata.locus_name[5].locus_name,
							locusName2:	 testdata.locus_name[1].locus_name,
							method: {
								id: testdata.keywords[0].id,
								name: testdata.keywords[0].name
							}
						}
					},
					{
						id: testdata.annotations[4].id,
						type: testdata.annotation_types[0].name,
						data: {
							locusName: testdata.locus_name[5].locus_name,
							text: testdata.comment_annotations[0].text
						}
					},
					{
						id: testdata.annotations[5].id,
						type: testdata.annotation_types[0].name,
						data: {
							locusName: testdata.locus_name[4].locus_name,
							text: testdata.comment_annotations[1].text
						}
					}
				]
			};

			chai.request(server)
				.get(`/api/submission/${testSubmission.id}`)
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(res.status).to.equal(200);
					chai.expect(res.body).to.containSubset(expectedSubmission);
					done();
				});
		});

	});

});
