"use strict";

const chai = require('chai');
chai.use(require('chai-http'));
const combinatorics = require('js-combinatorics');
const _             = require('lodash');

const server = require('../app');
const auth   = require('../app/lib/authentication');
const knex   = require('../app/lib/bookshelf').knex;

const testdata = require('../seeds/test_data.json');

describe('Annotation Controller', function() {

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

	describe('POST /api/annotation/', function() {

		it('Authentication is required', function(done) {
			chai.request(server)
				.post('/api/annotation/')
				.end((err, res) => {
					chai.expect(res.status).to.equal(401);
					chai.expect(res.text).to.contain('No authorization header provided');
					done();
				});
		});

		it('Providing invalid Annotation type responds with error', function(done) {
			let fakeAnnotationType = 'fake type';
			chai.request(server)
				.post('/api/annotation/')
				.send({annotation_type: fakeAnnotationType})
				.set({Authorization: `Bearer ${testToken}`})
				.end((err, res) => {
					chai.expect(res.status).to.equal(400);
					chai.expect(res.text).to.equal(`Unrecognized annotation_type ${fakeAnnotationType}`);
					done();
				});
		});

		let testAnnotations = createAnnotationRequestBodies();

		/* Test for errors with a little more finesse than just copying / pasting
		 * the same code with a one line change 40 times.
		 */
		Object.keys(testAnnotations).forEach(type => {
			let testAnnotation = testAnnotations[type];

			// Generate some combination of missing fields to ensure we handle them all
			objectCombination(testAnnotation).forEach(annotationSubset => {

				// Ignore combinations without annotation_type. We handle that error in a separate test
				if (!annotationSubset.annotation_type) {
					return;
				}

				it(`Missing required ${type} fields responds with error`, function(done) {
					let missingFields = _.difference(Object.keys(testAnnotation), Object.keys(annotationSubset));

					// evidence_id is an optional field, so ignore it for this test (This is hacky, I know. Sorry.)
					let ignoreTerm = missingFields.indexOf('evidence_id');
					if (ignoreTerm !== -1) {
						missingFields.splice(ignoreTerm, 1);
					}

					chai.request(server)
						.post('/api/annotation/')
						.send(annotationSubset)
						.set({Authorization: `Bearer ${testToken}`})
						.end((err, res) => {
							chai.expect(res.status).to.equal(400);
							chai.expect(res.text).to.equal(`Missing ${type} fields: ${missingFields}`);
							done();
						});
				});

			});

			it(`Providing invalid ${type} fields responds with error`, function(done) {
				let invalidField = 'invalid_field';
				let annotationWithInvalidField = Object.assign({}, testAnnotation);
				annotationWithInvalidField[invalidField] = 123;

				chai.request(server)
					.post('/api/annotation/')
					.send(annotationWithInvalidField)
					.set({Authorization: `Bearer ${testToken}`})
					.end((err, res) => {
						chai.expect(res.status).to.equal(400);
						chai.expect(res.text).to.equal(`Invalid ${type} fields: ${invalidField}`);
						done();
					});
			});

			it(`Providing invalid Publication ID for ${type} responds with error`, function(done) {
				let badPublicationAnnotation = Object.assign({}, testAnnotation);
				badPublicationAnnotation.publication_id = 'Not DOI or Pubmed ID';

				chai.request(server)
					.post('/api/annotation/')
					.send(badPublicationAnnotation)
					.set({Authorization: `Bearer ${testToken}`})
					.end((err, res) => {
						chai.expect(res.status).to.equal(400);
						chai.expect(res.text).to.equal('Given publication ID is not a DOI or Pubmed ID');
						done();
					});
			});

			// Test that we catch all types of bad references
			let referencesToTest = ['submitter_id', 'status_id', 'keyword_id', 'method_id'];
			Object.keys(_.pick(testAnnotation, referencesToTest)).forEach(fieldToTest => {

				it(`Providing non-existing ${fieldToTest} for ${type} responds with error`, function(done) {
					let invalidReferenceAnnotation = Object.assign({}, testAnnotation);
					invalidReferenceAnnotation[fieldToTest] = 999;

					chai.request(server)
						.post('/api/annotation/')
						.send(invalidReferenceAnnotation)
						.set({Authorization: `Bearer ${testToken}`})
						.end((err, res) => {
							chai.expect(res.status).to.equal(400);
							chai.expect(res.text).to.equal(`Given ${fieldToTest} does not reference an existing record`);
							done();
						});
				});

			});

			it(`Existing ${type} publication record is used if it exists`, function(done) {
				let expectedPublicationIDs = [
					testdata.publications[0].id,
					testdata.publications[1].id
				];

				chai.request(server)
					.post('/api/annotation/')
					.send(testAnnotation)
					.set({Authorization: `Bearer ${testToken}`})
					.end((err, res) => {
						chai.expect(res.status).to.equal(201);
						chai.expect(res.body.publication_id).to.be.oneOf(expectedPublicationIDs);
						done();
					});
			});

			it(`New ${type} publication record created for new publication`, function(done) {
				let newPublicationId = testdata.publications.length + 1;
				let newPublicationIDAnnotation = Object.assign({}, testAnnotation);
				newPublicationIDAnnotation.publication_id = '12345';

				chai.request(server)
					.post('/api/annotation/')
					.send(newPublicationIDAnnotation)
					.set({Authorization: `Bearer ${testToken}`})
					.end((err, res) => {
						chai.expect(res.status).to.equal(201);
						chai.expect(res.body.publication_id).to.equal(newPublicationId);
						done();
					});
			});

			it(`Well-formed ${type} request responds with success`, function(done) {
				chai.request(server)
					.post('/api/annotation/')
					.send(testAnnotation)
					.set({Authorization: `Bearer ${testToken}`})
					.end((err, res) => {
						// We only want to test generic Annotation fields
						let noPubIDAnnotation = _.pick(testAnnotation, Object.keys(testdata.annotations[0]));
						delete noPubIDAnnotation.publication_id;

						chai.expect(res.status).to.equal(201);
						chai.expect(res.body).to.contain(noPubIDAnnotation);
						done();
					});
			});

		});

	});

});

/**
 * Helper function that creates request bodies for annotation creation (submission).
 * These requests are well-formed. Tests modify copies to test for errors.
 */
function createAnnotationRequestBodies() {
	let testGTAnnotation = Object.assign({}, testdata.annotations[0], testdata.gene_term_annotations[0]);
	delete testGTAnnotation.id;
	delete testGTAnnotation.annotation_id;
	testGTAnnotation.publication_id = testdata.publications[0].doi;

	let testGGAnnotation = Object.assign({}, testdata.annotations[2], testdata.gene_gene_annotations[0]);
	delete testGGAnnotation.id;
	delete testGGAnnotation.annotation_id;
	testGGAnnotation.publication_id = testdata.publications[1].pubmed_id;

	let testCAnnotation = Object.assign({}, testdata.annotations[4], testdata.comment_annotations[0]);
	delete testCAnnotation.id;
	delete testCAnnotation.annotation_id;
	testCAnnotation.publication_id = testdata.publications[1].pubmed_id;

	return {
		'gene_term_annotation' : testGTAnnotation,
		'gene_gene_annotation' : testGGAnnotation,
		'comment_annotation'   : testCAnnotation
	};
}

/**
 * Generates a list of all subsets of an object,
 * excluding the empty set and the object itself.
 */
function objectCombination(object) {
	let factorialLimit = 2;
	let combinations = [];

	let fields = Object.keys(object);
	combinatorics.combination(fields, factorialLimit).forEach(fieldSubset => {
		combinations.push(_.pick(object, fieldSubset));
	});

	return combinations;
}
