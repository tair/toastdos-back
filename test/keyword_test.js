"use strict";

const chai = require('chai');
chai.use(require('chai-http'));
chai.use(require('chai-subset'));

const server = require('../app');
const knex    = require('../app/lib/bookshelf').knex;
const Keyword = require('../app/models/keyword');

const testdata = require('../seeds/test_data.json');

describe('Keyword Controller', function() {

	before('Setup SQLite memory database', function() {
		return knex.migrate.latest();
	});

	beforeEach('Populate SQLite memory DB with fresh test data', function() {
		return knex.seed.run();
	});

	describe('POST /api/keyword/search', function() {

		it('Search is not performed with too few characters', function(done) {
			const testKeywordTypeID = testdata.keyword_types[0].id;

			chai.request(server)
				.post('/api/keyword/search')
				.send({
					substring: 'abcd',
					keyword_type: testKeywordTypeID
				})
				.end((err, res) => {
					chai.expect(res.status).to.equal(400);
					chai.expect(res.text).to.equal('Keyword search string too short');
					done();
				});
		});

		it('Only alphanumeric queries are accepted', function(done) {
			const testSubstring = 'abcdefg-/@#';
			const testKeywordTypeID = testdata.keyword_types[0].id;

			chai.request(server)
				.post('/api/keyword/search')
				.send({
					substring: testSubstring,
					keyword_type: testKeywordTypeID
				})
				.end((err, res) => {
					chai.expect(res.status).to.equal(400);
					chai.expect(res.text).to.equal(`Invalid Keyword search string ${testSubstring}`);
					done();
				});
		});

		it('Number of search results is limited', function(done) {
			const searchLimit = 20;
			const testKeywordTypeID = testdata.keyword_types[0].id;
			const testSubstring = 'Added Term';

			// Need to add more Keywords than the expected limit
			let keywordPromises = [];
			for (let i = 0; i < searchLimit * 2; i++) {
				keywordPromises.push(
					Keyword.forge({
						name : `${testSubstring} ${i}`,
						external_id : `T${i}`,
						keyword_type_id : testKeywordTypeID
					}).save()
				);
			}

			// Now do the test with the added Keywords
			Promise.all(keywordPromises).then(() => {
				chai.request(server)
					.post('/api/keyword/search')
					.send({
						substring: testSubstring,
						keyword_type: testKeywordTypeID
					})
					.end((err, res) => {
						chai.expect(res.status).to.equal(200);
						chai.expect(res.body).to.have.length(searchLimit);
						done();
					});
			});
		});

		it('Search result filtered by provided KeywordType', function(done) {
			const testKeywordTypeID = testdata.keyword_types[1].id;
			const expectedKeyword = testdata.keywords[2];

			chai.request(server)
				.post('/api/keyword/search')
				.send({
					substring: 'Test Term',
					keyword_type: testKeywordTypeID
				})
				.end((err, res) => {
					chai.expect(res.status).to.equal(200);
					chai.expect(res.body).to.have.length(1);
					chai.expect(res.body[0]).to.contain(expectedKeyword);
					done();
				});
		});

		it('Well-formed search responds with correct data', function(done) {
			const testKeywordTypeID = testdata.keyword_types[0].id;
			const expectedKeywords = [
				testdata.keywords[0],
				testdata.keywords[1]
			];

			chai.request(server)
				.post('/api/keyword/search')
				.send({
					substring: 'Test Term 00',
					keyword_type: testKeywordTypeID
				})
				.end((err, res) => {
					chai.expect(res.status).to.equal(200);
					chai.expect(res.body).to.have.length(2);
					chai.expect(res.body).to.containSubset(expectedKeywords);
					done();
				});
		});

	});

});
