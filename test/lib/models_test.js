'use strict';

const chai = require('chai');
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
const Taxon              = require('../../app/models/taxon');
const LocusName          = require('../../app/models/locus_name');
const Locus              = require('../../app/models/locus');
const ExternalSource     = require('../../app/models/external_source');
const GeneSymbol         = require('../../app/models/gene_symbol');

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
		it('Get Keyword with KeywordType', function(done) {
			let expectedKeyword = testdata.keywords[0];
			let expectedKeywordType = testdata.keyword_types[0];

			Keyword.where({id: expectedKeyword.id})
				.fetch({withRelated: 'keywordType'})
				.then(res => {
					let actual = res.toJSON();
					chai.expect(actual).to.include(expectedKeyword);
					chai.expect(actual.keywordType).to.deep.equal(expectedKeywordType);
					done();
				});
		});

		it('Get Synonyms', function(done) {
			let testKeyword = testdata.keywords[0];
			let expectedSynonyms = [
				testdata.synonyms[0],
				testdata.synonyms[1]
			];

			Keyword.where({id: testKeyword.id})
				.fetch({withRelated: 'synonyms'})
				.then(res => {
					let actual = res.toJSON();
					chai.expect(actual.synonyms).to.deep.equal(expectedSynonyms);
					done();
				});
		});
	});

	describe('KeywordType', function() {
		it('Get KeywordType and associated Keywords', function(done) {
			let expectedKeywordType = testdata.keyword_types[0];
			let expectedKeywords = [
				testdata.keywords[0],
				testdata.keywords[1]
			];

			KeywordType.where({id: expectedKeywordType.id})
				.fetch({withRelated: 'keywords'})
				.then(res => {
					let actual = res.toJSON();
					chai.expect(actual).to.include(expectedKeywordType);
					chai.expect(actual.keywords).to.deep.equal(expectedKeywords);
					done();
				});
		});
	});

	describe('Synonym', function() {
		it('Get Synonym with associated Keyword', function(done) {
			let expectedSynonym = testdata.synonyms[0];
			let expectedKeyword = testdata.keywords[0];

			Synonym.where({id: expectedSynonym.id})
				.fetch({withRelated: 'keyword'})
				.then(res => {
					let actual = res.toJSON();
					chai.expect(actual).to.include(expectedSynonym);
					chai.expect(actual.keyword).to.deep.equal(expectedKeyword);
					done();
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

		it('Status for Annotation can be retrieved', function(done) {
			let testAnnotation = testdata.annotations[0];
			let expectedStatus = testdata.annotation_statuses[0];

			Annotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'status'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.status).to.deep.equal(expectedStatus);
					done();
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

		it('Gene to Term information can be retrieved', function(done) {
			let testAnnotation = testdata.annotations[0];
			let expectedGTAnnotationPart = testdata.gene_term_annotations[0];

			Annotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'childData'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.childData).to.deep.equal(expectedGTAnnotationPart);
					done();
				});
		});

		it('Gene to Gene information can be retrieved', function(done) {
			let testAnnotation = testdata.annotations[2];
			let expectedGGAnnotationPart = testdata.gene_gene_annotations[0];

			Annotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'childData'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.childData).to.deep.equal(expectedGGAnnotationPart);
					done();
				});
		});

		it('Comment information can be retrieved', function(done) {
			let testAnnotation = testdata.annotations[4];
			let expectedCAnnotationPart = testdata.comment_annotations[0];

			Annotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'childData'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.childData).to.deep.equal(expectedCAnnotationPart);
					done();
				});
		});

	});

	describe('Gene to Term Annotation', function() {

		it('Method Keyword for Annotation can be retrieved', function(done) {
			let testAnnotation = testdata.gene_term_annotations[0];
			let expectedKeyword = testdata.keywords[0];

			GeneTermAnnotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'method'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.method).to.deep.equal(expectedKeyword);
					done();
				});
		});

		it('Subject Keyword for Annotation can be retrieved', function(done) {
			let testAnnotation = testdata.gene_term_annotations[0];
			let expectedKeyword = testdata.keywords[1];

			GeneTermAnnotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'keyword'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.keyword).to.deep.equal(expectedKeyword);
					done();
				});
		});

		it('Parent Annotation information can be retrieved', function(done) {
			let testAnnotation = testdata.gene_term_annotations[0];
			let expectedParent = testdata.annotations[0];

			GeneTermAnnotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'parentData'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.parentData).to.contain(expectedParent);
					done();
				});
		});

	});

	describe('Gene to Gene Annotation', function() {

		it('Method Keyword for Annotation can be retrieved', function(done) {
			let testAnnotation = testdata.gene_gene_annotations[0];
			let expectedKeyword = testdata.keywords[0];

			GeneGeneAnnotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'method'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.method).to.deep.equal(expectedKeyword);
					done();
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

	describe('Taxon', function() {

		it('All locuses referencing this Taxon can be retrieved', function() {
			let testTaxon = testdata.taxon[0];
			let expectedLocuses = [
				testdata.locus[0],
				testdata.locus[1]
			];

			return Taxon.where({id: testTaxon.id})
				.fetch({withRelated: 'locuses'})
				.then(res => {
					if (!res) throw new Error('No locuses were returned');
					let actual = res.toJSON();
					chai.expect(actual.locuses).to.containSubset(expectedLocuses);
				});
		});

	});

	describe('Locus Name', function() {

		it('Gets parent Locus for this Locus Name', function() {
			let testLocusName = testdata.locus_name[0];
			let expectedLocus = testdata.locus[0];

			return LocusName.where({id: testLocusName.id})
				.fetch({withRelated: 'locus'})
				.then(res => {
					if (!res) throw new Error('No Locus was returned');
					let actual = res.toJSON();
					chai.expect(actual.locus).to.contain(expectedLocus);
				});
		});

		it('Gets source for this Locus name', function() {
			let testLocusName = testdata.locus_name[0];
			let expectedSource = testdata.external_source[0];

			return LocusName.where({id: testLocusName.id})
				.fetch({withRelated: 'source'})
				.then(res => {
					if (!res) throw new Error('No Source was returned');
					let actual = res.toJSON();
					chai.expect(actual.source).to.contain(expectedSource);
				});
		});

	});

	describe('Locus', function() {

		it('Gets Taxon information for this Locus', function() {
			let testLocus = testdata.locus[0];
			let expectedTaxon = testdata.taxon[0];

			return Locus.where({id: testLocus.id})
				.fetch({withRelated: 'taxon'})
				.then(res => {
					if (!res) throw new Error('No Taxon was returned');
					let actual = res.toJSON();
					chai.expect(actual.taxon).to.contain(expectedTaxon);
				});
		});

		it('Gets LocusName information for this Locus', function() {
			const testLocus = testdata.locus[0];
			const expectedLocusNames = [
				testdata.locus_name[0],
				testdata.locus_name[2],
				testdata.locus_name[3]
			];

			return Locus.where({id: testLocus.id})
				.fetch({withRelated: 'names'})
				.then(res => {
					if (!res) throw new Error('No LocusNames were returned');
					let actual = res.toJSON();
					chai.expect(actual.names).to.containSubset(expectedLocusNames);
				});
		});

		it('Gets GeneSymbol information for this Locus', function() {
			const testLocus = testdata.locus[0];
			const expectedGeneSymbols = [
				testdata.gene_symbol[0],
				testdata.gene_symbol[1],
				testdata.gene_symbol[3]
			];

			return Locus.where({id: testLocus.id})
				.fetch({withRelated: 'symbols'})
				.then(res => {
					if (!res) throw new Error('No GeneSymbols were returned');
					let actual = res.toJSON();
					chai.expect(actual.symbols).to.containSubset(expectedGeneSymbols);
				});
		});

	});

	describe('External Source', function() {

		it('Gets all referencing Locus Names', function() {
			let testSource = testdata.external_source[0];
			let expectedLocusNames = [
				testdata.locus_name[0],
				testdata.locus_name[1]
			];

			return ExternalSource.where({id: testSource.id})
				.fetch({withRelated: 'locusNames'})
				.then(res => {
					if (!res) throw new Error('No Locus Names were returned');
					let actual = res.toJSON();
					chai.expect(actual.locusNames).to.containSubset(expectedLocusNames);
				});
		});

	});

	describe('Gene Symbol', function() {

		it('Source for this Gene Symbol can be retrieved', function() {
			let testSymbol = testdata.gene_symbol[0];
			let expectedSource = testdata.external_source[0];

			return GeneSymbol.where({id: testSymbol.id})
				.fetch({withRelated: 'source'})
				.then(res => {
					if (!res) throw new Error('No Source was returned');
					let actual = res.toJSON();
					chai.expect(actual.source).to.contain(expectedSource);
				});
		});

		it('Locus this Gene Symbol belongs to can be retrieved', function() {
			let testSymbol = testdata.gene_symbol[0];
			let expectedLocus = testdata.locus[0];

			return GeneSymbol.where({id: testSymbol.id})
				.fetch({withRelated: 'locus'})
				.then(res => {
					if (!res) throw new Error('No Locus was returned');
					let actual = res.toJSON();
					chai.expect(actual.locus).to.contain(expectedLocus);
				});
		});

		it('User who submitted this Gene Symbol can be retrieved', function() {
			let testSymbol = testdata.gene_symbol[0];
			let expectedUser = testdata.users[0];

			return GeneSymbol.where({id: testSymbol.id})
				.fetch({withRelated: 'submitter'})
				.then(res => {
					if (!res) throw new Error('No User was returned');
					let actual = res.toJSON();
					chai.expect(actual.submitter).to.contain(expectedUser);
				});
		});

	});

});
