'use strict';

const chai = require('chai');

const knex        = require('../../app/lib/bookshelf').knex;
const oboImporter = require('../../app/services/obo_importer/gene_ontology_importer');

const KeywordType = require('../../app/models/keyword_type');
const Keyword     = require('../../app/models/keyword');
const Synonym     = require('../../app/models/synonym');

describe('OBO Data Importer', function() {

	before('Run the data import script on a test file to populate the database', function() {
		return knex.migrate.latest()
			.then(() => oboImporter.loadOboIntoDB('./test/lib/test_terms.obo'))
			.then(() => oboImporter.loadOboIntoDB('./test/lib/test_terms.obo'));
			 // Do it twice to ensure no duplicates
	});

	it('KeywordTypes added from basic term', function() {
		return KeywordType.where({name: 'basic_keyword_type'})
			.fetch()
			.then(keywordType => chai.expect(keywordType).to.exist);
	});

	it('Keyword added from basic term', function() {
		return Keyword.where({external_id: 'GO:0000001'})
			.fetch()
			.then(keyword => chai.expect(keyword).to.exist);
	});

	it('Synonyms added from basic term', function() {
		return Synonym.where({name: 'a synonym'})
			.fetch()
			.then(synonym => chai.expect(synonym).to.exist);
	});

	it('Duplicate KeywordTypes not added', function() {
		return KeywordType.where({name: 'basic_keyword_type'})
			.fetchAll()
			.then(keywordTypes => chai.expect(keywordTypes).to.have.lengthOf(1));
	});

	it('Duplicate Keyword not added', function() {
		return Keyword.where({external_id: 'GO:0000001'})
			.fetchAll()
			.then(keywords => chai.expect(keywords).to.have.lengthOf(1));
	});

	it('Duplicate Synonym not added', function() {
		return Synonym.where({name: 'a synonym'})
			.fetchAll()
			.then(synonyms => chai.expect(synonyms).to.have.lengthOf(1));
	});

	it('Long synonym names are truncated', function() {
		// 252 characters plus an ellipsis
		const truncatedName = 'This is a really long synonym that\'s too big for ' +
			'the database, so the name will be truncated to something smaller than ' +
			'this. That\'s it, really. The rest of this description is just redundant, ' +
			'verbose nonsense to hit the character limit for truncation, ...';

		return Synonym.where('name', 'LIKE', '%really long synonym%').fetch().then(synonym => {
			chai.expect(synonym.get('name')).to.equal(truncatedName);
			chai.expect(synonym.get('name')).to.have.lengthOf(255);
		});
	});

	it('Keyword with no KeywordType uses default KeywordType', function() {
		return Keyword.where({external_id: 'GO:0000002'})
			.fetch({withRelated: 'keywordType'})
			.then(keyword => chai.expect(keyword.related('keywordType').get('name')).to.equal('default_keyword_type'));
	});

	it('Keyword with KeywordType overrides default KeywordType', function () {
		return Keyword.where({external_id: 'GO:0000003'})
			.fetch({withRelated: 'keywordType'})
			.then(keyword => chai.expect(keyword.related('keywordType').get('name')).to.equal('overide_keyword_type'));
	});

	it('Multiple Keywords can share Synonym names', function() {
		return Synonym.where({name: 'Name conflict synonym'})
			.fetchAll()
			.then(synonyms => chai.expect(synonyms).to.have.lengthOf(2));
	});

	it('Blank KeywordTypes are not added', function() {
		return KeywordType.where({name: null})
			.fetchAll()
			.then(synonyms => chai.expect(synonyms).to.have.lengthOf(0));
	});

	describe('Updating', function() {

		beforeEach('Clear DB, run importer, then run update', function() {
			return Promise.all([
				knex('gene_term_annotation').truncate(),
				knex('gene_gene_annotation').truncate(),
				knex('comment_annotation').truncate()
			]).then(() => {
				return knex('annotation').truncate();
			}).then(() => {
				return knex('synonym').truncate();
			}).then(() => {
				return knex('keyword').truncate();
			}).then(() => {
				return knex('keyword_type').truncate();
			}).then(() => {
				return oboImporter.loadOboIntoDB('./test/lib/test_terms.obo');
			});
		});

		it('Newly obsoleted Keywords are properly updated', function() {
			const expectedKeyword = {
				external_id: 'GO:0000004',
				name: 'test keyword 4',
				is_obsolete: true
			};

			return oboImporter.loadOboIntoDB('./test/lib/test_terms_update.obo').then(() => {
				return Keyword.where({external_id: 'GO:0000004'}).fetch();
			}).then(keyword => {
				let actual = keyword.toJSON();
				actual.is_obsolete = !!actual.is_obsolete; // Cooerce into boolean
				chai.expect(actual).to.contain(expectedKeyword);
			});
		});

		it('Non-obsolete keywords are not marked obsolete', function() {
			const expectedKeyword = {
				external_id: 'GO:0000001',
				name: 'test keyword 1',
				is_obsolete: false
			};

			return oboImporter.loadOboIntoDB('./test/lib/test_terms_update.obo').then(() => {
				return Keyword.where({external_id: 'GO:0000001'}).fetch();
			}).then(keyword => {
				let actual = keyword.toJSON();
				actual.is_obsolete = !!actual.is_obsolete; // Cooerce into boolean
				chai.expect(actual).to.contain(expectedKeyword);
			});
		});

	});

});
