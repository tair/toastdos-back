'use strict';

const chai = require('chai');
chai.use(require('chai-subset'));
chai.use(require('chai-subset'));

const knex = require('../../app/lib/bookshelf').knex;

const User               = require('../../app/models/user');
const KeywordType        = require('../../app/models/keyword_type');
const Keyword            = require('../../app/models/keyword');
const Synonym            = require('../../app/models/synonym');
const Publication        = require('../../app/models/publication');
const AnnotationStatus   = require('../../app/models/annotation_status');
const AnnotationType     = require('../../app/models/annotation_type');
const Annotation         = require('../../app/models/annotation');
const GeneTermAnnotation = require('../../app/models/gene_term_annotation');
const GeneGeneAnnotation = require('../../app/models/gene_gene_annotation');
const CommentAnnotation  = require('../../app/models/comment_annotation');
const Taxon              = require('../../app/models/taxon');
const LocusName          = require('../../app/models/locus_name');
const Locus              = require('../../app/models/locus');
const ExternalSource     = require('../../app/models/external_source');
const GeneSymbol         = require('../../app/models/gene_symbol');
const Draft              = require('../../app/models/draft');
const Submission         = require('../../app/models/submission');

const testdata = require('../../seeds/test/test_data.json');

describe('Models', function() {

	// Make sure the database is up to date
	before('Setup SQLite memory database', function() {
		return knex.migrate.latest();
	});

	// Give us fresh test data in a sqlite memory database for each test
	beforeEach('Populate SQLite memory DB with fresh test data', function() {
		return knex.seed.run();
	});

	describe('User', function() {

		it('Drafts associated with this User are successfully retrieved');

		it('Roles this User has can be retrieved', function() {
			const testUser = testdata.users[0];
			const expectedRoles = [
				testdata.roles[0],
				testdata.roles[1]
			];

			return User.where({id: testUser.id})
				.fetch({withRelated: 'roles'})
				.then(res => {
					let actual = res.toJSON();
					chai.expect(actual.roles).to.containSubset(expectedRoles);
				});
		});

		it('Submissions this user created can be retrieved', function() {
			const testUser = testdata.users[1];
			const expectedSubmissions = [
				testdata.submission[1],
				testdata.submission[2]
			];

			return User.where({id: testUser.id})
				.fetch({withRelated: 'submissions'})
				.then(res => {
					if (!res) throw new Error('No User was returned');
					let actual = res.toJSON();
					chai.expect(actual.submissions).to.containSubset(expectedSubmissions);
				});
		});

	});

	describe('Draft', function() {

		it('User who submitted this Draft can be retrieved');

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

		it('addNew', function() {
			const testKeyword = testdata.keywords[0];
			const newExtId = 'NEID001';

			return Keyword.addNew({
				name: testKeyword.name,
				external_id: newExtId,
				type_name: testdata.keyword_types[0].name
			}).then(res => {
				let actual = res.toJSON();
				chai.expect(actual.name).to.equal(testKeyword.name);
				chai.expect(actual.external_id).to.equal(newExtId);
				chai.expect(actual.id).to.not.equal(testKeyword.id);
			});
		});

		it('addOrGet', function() {
			const testKeyword = testdata.keywords[0];

			return Keyword.addOrGet({
				name: testKeyword.name,
				external_id: testKeyword.external_id,
				type_name: testdata.keyword_types[0].name
			}).then(res => {
				let actual = res.toJSON();
				chai.expect(actual.name).to.equal(testKeyword.name);
				chai.expect(actual.external_id).to.equal(testKeyword.external_id);
				chai.expect(actual.id).to.equal(testKeyword.id);
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

		it('getByName', function() {
			const testKeyword = testdata.keyword_types[0];
			return KeywordType.getByName(testKeyword.name).then(res => {
				let actual = res.toJSON();
				chai.expect(actual).to.contain(testKeyword);
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

		it('Get Annotations associated with Publication', function() {
			let testPublication = testdata.publications[0];
			let expectedAnnotations = [
				testdata.annotations[0],
				testdata.annotations[1]
			];

			return Publication.where({id: testPublication.id})
				.fetch({withRelated: 'annotations'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.annotations).to.containSubset(expectedAnnotations);
				});
		});

		it('Get Submissions associated with Publication', function() {
			const testPublication = testdata.publications[1];
			const expectedSubmissions = [
				testdata.submission[1],
				testdata.submission[2]
			];

			return Publication.where({id: testPublication.id})
				.fetch({withRelated: 'submissions'})
				.then(res => {
					if (!res) throw new Error('No User was returned');
					let actual = res.toJSON();
					chai.expect(actual.submissions).to.containSubset(expectedSubmissions);
				});
		});

		it('addOrGet adds', function() {
			const newPubName = 12345;
			return Publication.addOrGet({pubmed_id: newPubName}).then(res => {
				let actual = res.toJSON();
				chai.expect(actual.pubmed_id).to.equal(newPubName);
				testdata.publications.forEach(publication => {
					chai.expect(actual.id).to.not.equal(publication.id);
				});
			});
		});

		it('addOrGet gets', function() {
			const testPub = testdata.publications[0];
			return Publication.addOrGet({doi: testPub.doi}).then(res => {
				let actual = res.toJSON();
				chai.expect(actual).to.contain(testPub);
			});
		});

	});

	describe('Annotation Status', function() {

		it('Get Annotations with this status', function() {
			let testStatus = testdata.annotation_statuses[0];
			let expectedAnnotations = [
				testdata.annotations[0],
				testdata.annotations[2]
			];

			return AnnotationStatus.where({id: testStatus.id})
				.fetch({withRelated: 'annotations'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.annotations).to.containSubset(expectedAnnotations);
				});
		});

	});

	describe('Annotation Type', function() {

		it('Get Annotations with this type', function() {
			let testType = testdata.annotation_types[1];
			let expectedAnnotations = [
				testdata.annotations[1],
				testdata.annotations[2]
			];

			return AnnotationType.where({id: testType.id})
				.fetch({withRelated: 'annotations'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.annotations).to.containSubset(expectedAnnotations);
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

		it('Type for Annotation can be retrieved', function() {
			let testAnnotation = testdata.annotations[0];
			let expectedType = testdata.annotation_types[0];

			return Annotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'type'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.type).to.contain(expectedType);
				});
		});

		it('Publication for Annotation can be retrieved', function() {
			let testAnnotation = testdata.annotations[0];
			let expectedPublication = testdata.publications[0];

			return Annotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'publication'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.publication).to.contain(expectedPublication);
				});
		});

		it('Submission this Annotation belongs to can be retrieved', function() {
			const testAnnotation = testdata.annotations[0];
			const expectedSubmission = testdata.submission[0];

			return Annotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'submission'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.submission).to.contain(expectedSubmission);
				});
		});

		it('User who submitted the Annotation can be retrieved', function() {
			let testAnnotation = testdata.annotations[0];
			let expectedUser = testdata.users[0];

			return Annotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'submitter'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.submitter).to.contain(expectedUser);
				});
		});

		it('Locus the Annotation refers to can be retrieved', function() {
			let testAnnotation = testdata.annotations[0];
			let expectedLocus = testdata.locus[0];

			return Annotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'locus'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.locus).to.contain(expectedLocus);
				});
		});

		it('GeneSymbol for the Locus the Annotation refers to can be retrieved', function() {
			let testAnnotation = testdata.annotations[0];
			let expectedSymbol = testdata.gene_symbol[0];

			return Annotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'locusSymbol'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.locusSymbol).to.contain(expectedSymbol);
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

		it('Evidence Locus for Annotation can be retrieved', function() {
			let testAnnotation = testdata.gene_term_annotations[0];
			let expectedLocus = testdata.locus[0];

			return GeneTermAnnotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'evidence'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.evidence).to.contain(expectedLocus);
				});
		});

		it('GeneSymbol for evidence Locus of Annotation can be retrieved', function() {
			let testAnnotation = testdata.gene_term_annotations[0];
			let expectedSymbol = testdata.gene_symbol[0];

			return GeneTermAnnotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'evidenceSymbol'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.evidenceSymbol).to.contain(expectedSymbol);
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

		it('Locus2 Locus for Annotation can be retrieved', function() {
			let testAnnotation = testdata.gene_gene_annotations[0];
			let expectedLocus2 = testdata.locus[0];

			return GeneGeneAnnotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'locus2'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.locus2).to.contain(expectedLocus2);
				});
		});

		it('GeneSymbol for locus2 Locus of Annotation can be retrieved', function() {
			let testAnnotation = testdata.gene_gene_annotations[0];
			let expectedSymbol = testdata.gene_symbol[0];

			return GeneGeneAnnotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'locus2Symbol'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.locus2Symbol).to.contain(expectedSymbol);
				});
		});

		it('Parent Annotation information can be retrieved', function() {
			let testAnnotation = testdata.gene_gene_annotations[0];
			let expectedParent = testdata.annotations[2];

			return GeneGeneAnnotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'parentData'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.parentData).to.contain(expectedParent);
				});
		});

	});

	describe('Comment Annotation', function() {

		it('Parent Annotation information can be retrieved', function() {
			let testAnnotation = testdata.comment_annotations[0];
			let expectedParent = testdata.annotations[4];

			return CommentAnnotation.where({id: testAnnotation.id})
				.fetch({withRelated: 'parentData'})
				.then(res => {
					if (!res) throw new Error('No models were returned');
					let actual = res.toJSON();
					chai.expect(actual.parentData).to.contain(expectedParent);
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

		it('addOrGet adds', function() {
			const newTaxon = {
				name: 'Vulpes vulpes',
				taxon_id: 9627
			};

			return Taxon.addOrGet(newTaxon).then(res => {
				let actual = res.toJSON();
				chai.expect(actual).to.contain(newTaxon);
				testdata.taxon.forEach(taxon => {
					chai.expect(actual.id).to.not.equal(taxon.id);
				});
			});
		});

		it('addOrGet gets', function() {
			const existingTaxon = testdata.taxon[0];
			return Taxon.addOrGet(existingTaxon).then(res => {
				let actual = res.toJSON();
				chai.expect(actual).to.contain(existingTaxon);
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

	describe('Submission', function() {

		it('User who created Submission can be retrieved', function() {
			const testSubmission = testdata.submission[0];
			const expectedUser = testdata.users[0];

			return Submission.where({id: testSubmission.id})
				.fetch({withRelated: 'submitter'})
				.then(res => {
					if (!res) throw new Error('No User was returned');
					let actual = res.toJSON();
					chai.expect(actual.submitter).to.contain(expectedUser);
				});
		});

		it('Publication this Submission references can be retrieved', function() {
			const testSubmission = testdata.submission[0];
			const expectedPublication = testdata.publications[0];

			return Submission.where({id: testSubmission.id})
				.fetch({withRelated: 'publication'})
				.then(res => {
					if (!res) throw new Error('No User was returned');
					let actual = res.toJSON();
					chai.expect(actual.publication).to.contain(expectedPublication);
				});
		});

		it('All Annotations associated with a Submission can be retrieved', function() {
			const testSubmission = testdata.submission[0];
			const expectedAnnotations = [
				testdata.annotations[0],
				testdata.annotations[1]
			];

			return Submission.where({id: testSubmission.id})
				.fetch({withRelated: 'annotations'})
				.then(res => {
					if (!res) throw new Error('No User was returned');
					let actual = res.toJSON();
					chai.expect(actual.annotations).to.containSubset(expectedAnnotations);
				});
		});

	});

});
