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
					chai.expect(res.text).to.contain('Unrecognized annotation_type');
					done();
				});
		});

		let testAnnotations = createAnnotationRequestBodies();

		/* Test for errors with a little more finesse than just copying / pasting
		 * the same code with a one line change 40 times.
		 */
		Object.keys(testAnnotations).forEach(type => {
			let testAnnotation = testAnnotations[type];

			// Generate every combination of missing fields to ensure we handle them all
			objectCombination(testAnnotation).forEach(subObject => {

				// Ignore combinations without annotation_type. We handle that error in a separate test
				if (!subObject.annotation_type) {
					return;
				}

				it(`Missing required ${type} fields responds with error`);

			});

			it(`Providing invalid ${type} fields responds with error`);

			it(`Providing invalid Publication ID for ${type} responds with error`);

			// Test that we catch all types of bad references
			let referencesToTest = ['submitter_id', 'status_id', 'keyword_id', 'method_id'];
			Object.keys(_.pick(testAnnotation, referencesToTest)).forEach(fieldToTest => {

				// Make a copy of our test annotation with bad references
				let invalidatedObject = Object.assign({}, testAnnotation);
				invalidatedObject[fieldToTest] = 999;

				it(`Providing non-existing ${fieldToTest} for ${type} responds with error`);

			});

		});

		it('Well-formed GeneTermAnnotation request responds with success');

		it('Well-formed GeneGeneAnnotation request responds with success');

		it('Well-formed CommentAnnotation request responds with success');

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

	let testGGAnnotation = Object.assign({}, testdata.annotations[0], testdata.gene_gene_annotations[0]);
	delete testGGAnnotation.id;
	delete testGGAnnotation.annotation_id;

	let testCAnnotation = Object.assign({}, testdata.annotations[0], testdata.comment_annotations[0]);
	delete testCAnnotation.id;
	delete testCAnnotation.annotation_id;

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
	let combinations = [];

	let fields = Object.keys(object);
	combinatorics.combination(fields, fields.length - 1).forEach(fieldSubset => {
		combinations.push(_.pick(object, fieldSubset));
	});

	return combinations;
}
