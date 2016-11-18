"use strict";

const chai = require('chai');
const knex = require('../app/lib/bookshelf').knex;

const KeywordType = require('../app/models/keyword_type');
const Keyword     = require('../app/models/keyword');
const Synonym     = require('../app/models/synonym');

const testdata = require('../seeds/test_data.json');

describe('Models', function() {

	before(function(done) {
		// Give us fresh test data in a sqlite memory database for each test
		knex.migrate.latest()
			.then(() => knex.seed.run())
			.then(() => done());
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

});
