'use strict';

const chai = require('chai');
chai.use(require('chai-subset'));
chai.use(require('chai-subset'));

const knex = require('../../app/lib/bookshelf').knex;

const KeywordType        = require('../../app/models/keyword_type');
const Keyword            = require('../../app/models/keyword');
const Synonym            = require('../../app/models/synonym');
const Publication        = require('../../app/models/publication');
const AnnotationStatus   = require('../../app/models/annotation_status');
const Annotation         = require('../../app/models/annotation');
const GeneTermAnnotation = require('../../app/models/gene_term_annotation');
const GeneGeneAnnotation = require('../../app/models/gene_gene_annotation');
const CommentAnnotation  = require('../../app/models/comment_annotation');

const testdata = require('../../seeds/test_data.json');

describe('Models', function() {

	// Make sure the database is up to date
	before(function() {
		return knex.migrate.latest();
	});

	// Give us fresh test data in a sqlite memory database for each test
	beforeEach(function() {
		return knex.seed.run();
	});

	describe('Keyword', function() {
		it('Get Keyword with KeywordType', function() {
			let expectedKeyword = testdata.keywords[0];
			let expectedKeywordType = testdata.keyword_types[0];

			return Keyword.where({id: expectedKeyword.id})
				.fetch({withRelated: 'keywordType'})
				.then(res => {
					let actual = res.toJSON();
					chai.expect(actual).to.include(expectedKeyword);
					chai.expect(actual.keywordType).to.contain(expectedKeywordType);
				});
		});

		it('Get Synonyms', function() {
			let testKeyword = testdata.keywords[0];
			let expectedSynonyms = [
				testdata.synonyms[0],
				testdata.synonyms[1]
			];

			return Keyword.where({id: testKeyword.id})
				.fetch({withRelated: 'synonyms'})
				.then(res => {
					let actual = res.toJSON();
					chai.expect(actual.synonyms).to.containSubset(expectedSynonyms);

				});
		});
	});

	describe('KeywordType', function() {
		it('Get KeywordType and associated Keywords', function() {
			let expectedKeywordType = testdata.keyword_types[0];
			let expectedKeywords = [
				testdata.keywords[0],
				testdata.keywords[1]
			];

			return KeywordType.where({id: expectedKeywordType.id})
				.fetch({withRelated: 'keywords'})
				.then(res => {
					let actual = res.toJSON();
					chai.expect(actual).to.include(expectedKeywordType);
					chai.expect(actual.keywords).to.containSubset(expectedKeywords);
				});
		});
	});

	describe('Synonym', function() {
		it('Get Synonym with associated Keyword', function() {
			let expectedSynonym = testdata.synonyms[0];
			let expectedKeyword = testdata.keywords[0];

			return Synonym.where({id: expectedSynonym.id})
				.fetch({withRelated: 'keyword'})
				.then(res => {
					let actual = res.toJSON();
					chai.expect(actual).to.include(expectedSynonym);
					chai.expect(actual.keyword).to.contain(expectedKeyword);
				});
		});
	});

	describe('Publication', function() {

		it('Get Annotations associated with Publication', function(done) {
			let testPublication = testdata.publications[0];
			let expectedAnnotations = [
				testdata.annotations[0],
				testdata.annotations[1]
			];

			Publication.where({id: testPublication.id})
				.fetch({withRelated: 'referencedBy'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.referencedBy).to.containSubset(expectedAnnotations);
					done();
				});
		});

	});

	describe('Annotation Status', function() {

		it('Get Annotations with this status', function(done) {
			let testStatus = testdata.annotation_statuses[0];
			let expectedAnnotations = [
				testdata.annotations[0],
				testdata.annotations[2]
			];

			AnnotationStatus.where({id: testStatus.id})
				.fetch({withRelated: 'annotations'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.annotations).to.containSubset(expectedAnnotations);
					done();
				});
		});

	});

	describe('Annotation Base', function() {

		it('Status for Annotation can be retrieved', function() {
			let testAnnotation = testdata.annotations[0];
			let expectedStatus = testdata.annotation_statuses[0];

			return Annotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'status'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.status).to.contain(expectedStatus);
				});
		});

		it('Publication for Annotation can be retrieved', function(done) {
			let testAnnotation = testdata.annotations[0];
			let expectedPublication = testdata.publications[0];

			Annotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'publication'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.publication).to.contain(expectedPublication);
					done();
				});
		});

		it('User who submitted the Annotation can be retrieved', function(done) {
			let testAnnotation = testdata.annotations[0];
			let expectedUser = testdata.users[0];

			Annotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'submitter'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.submitter).to.contain(expectedUser);
					done();
				});
		});

		it('Gene to Term information can be retrieved', function() {
			let testAnnotation = testdata.annotations[0];
			let expectedGTAnnotationPart = testdata.gene_term_annotations[0];

			return Annotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'childData'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.childData).to.contain(expectedGTAnnotationPart);
				});
		});

		it('Gene to Gene information can be retrieved', function() {
			let testAnnotation = testdata.annotations[2];
			let expectedGGAnnotationPart = testdata.gene_gene_annotations[0];

			return Annotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'childData'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.childData).to.contain(expectedGGAnnotationPart);
				});
		});

		it('Comment information can be retrieved', function() {
			let testAnnotation = testdata.annotations[4];
			let expectedCAnnotationPart = testdata.comment_annotations[0];

			return Annotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'childData'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.childData).to.contain(expectedCAnnotationPart);

				});
		});

	});

	describe('Gene to Term Annotation', function() {

		it('Method Keyword for Annotation can be retrieved', function() {
			let testAnnotation = testdata.gene_term_annotations[0];
			let expectedKeyword = testdata.keywords[0];

			return GeneTermAnnotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'method'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.method).to.contain(expectedKeyword);
				});
		});

		it('Subject Keyword for Annotation can be retrieved', function() {
			let testAnnotation = testdata.gene_term_annotations[0];
			let expectedKeyword = testdata.keywords[1];

			return GeneTermAnnotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'keyword'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.keyword).to.contain(expectedKeyword);
				});
		});

		it('Parent Annotation information can be retrieved', function() {
			let testAnnotation = testdata.gene_term_annotations[0];
			let expectedParent = testdata.annotations[0];

			return GeneTermAnnotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'parentData'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.parentData).to.contain(expectedParent);

				});
		});

	});

	describe('Gene to Gene Annotation', function() {

		it('Method Keyword for Annotation can be retrieved', function() {
			let testAnnotation = testdata.gene_gene_annotations[0];
			let expectedKeyword = testdata.keywords[0];

			return GeneGeneAnnotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'method'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.method).to.contain(expectedKeyword);
				});
		});

		it('Parent Annotation information can be retrieved', function(done) {
			let testAnnotation = testdata.gene_gene_annotations[0];
			let expectedParent = testdata.annotations[2];

			GeneGeneAnnotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'parentData'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.parentData).to.contain(expectedParent);
					done();
				});
		});

	});

	describe('Comment Annotation', function() {

		it('Parent Annotation information can be retrieved', function(done) {
			let testAnnotation = testdata.comment_annotations[0];
			let expectedParent = testdata.annotations[4];

			CommentAnnotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'parentData'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.parentData).to.contain(expectedParent);
					done();
				});
		});

	});

});
