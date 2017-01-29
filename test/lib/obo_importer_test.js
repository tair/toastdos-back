'use strict';

const chai = require('chai');

const knex        = require('../../app/lib/bookshelf').knex;
const oboImporter = require('../../app/services/gene_ontology_importer');

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

});
