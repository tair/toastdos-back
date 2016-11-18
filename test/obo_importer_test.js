"use strict";

const knex = require('../app/lib/bookshelf').knex;
const oboImporter = require('../app/services/gene_ontology_importer');

describe('OBO Importer', function() {

	before('Run the data import script on a test file to populate the database', function() {
		return knex.migrate.latest()
			.then(() => oboImporter.parseOboFileIntoDb('./test/test_terms.obo'));
	});

	it('KeywordTypes added from basic term');
	it('Keyword added from basic term');
	it('Synonyms added from basic term');
	it('Duplicate KeywordTypes not added');
	it('Duplicate Keyword not added');
	it('Duplicate Synonym not added');
	it('Keyword with no KeywordType uses default KeywordType');
	it('Keyword with KeywordType overrides default KeywordType');
	it('Multiple Keywords can share Synonym names');

});
