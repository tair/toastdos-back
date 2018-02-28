'use strict';

const chai = require('chai');
chai.use(require('chai-http'));
chai.use(require('chai-subset'));
const _ = require('lodash');

const server = require('../../app/index');
const knex    = require('../../app/lib/bookshelf').knex;
const Keyword = require('../../app/models/keyword');

const testdata = require('../../seeds/test/test_data.json');

describe('Keyword Controller', function() {

    before('Setup SQLite memory database', function() {
        return knex.migrate.latest();
    });

    beforeEach('Populate SQLite memory DB with fresh test data', function() {
        return knex.seed.run();
    });

    describe('GET /api/keyword/search', function() {

        it('Search is not performed with too few characters', function(done) {
            const testKeywordScope = testdata.keyword_types[0].name;
            const shortSubstr = 'ab';

            chai.request(server)
				.get(`/api/keyword/search?substring=${shortSubstr}&keyword_scope=${testKeywordScope}`)
				.end((err, res) => {
    chai.expect(res.status).to.equal(400);
    chai.expect(res.text).to.equal('Keyword search string too short');
    done();
});
        });

        it('Queries with symbols are accepted', function(done) {
            const testSubstring = 'Name-with';
            const testKeywordScope = testdata.keyword_types[1].name;
            const expectedKeyword = testdata.keywords[3];

            chai.request(server)
				.get(`/api/keyword/search?substring=${testSubstring}&keyword_scope=${testKeywordScope}`)
				.end((err, res) => {
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body[0]).to.contain(expectedKeyword);
    done();
});
        });

        it('Results with no external_id are not returned', function(done) {
            const testSubstring = "NoExt";

            chai.request(server)
                .get(`/api/keyword/search?substring=${testSubstring}`)
                .end((err,res) => {
                    chai.expect(res.status).to.equal(200);
                    chai.expect(res.body).to.deep.equal([]);
                    done();
                });
        });

        it('Searches with no results are undefined', function(done) {
            const testSubstring = "zzz";

            chai.request(server)
                .get(`/api/keyword/search?substring=${testSubstring}`)
                .end((err,res) => {
                    chai.expect(res.status).to.equal(200);
                    chai.expect(res.body).to.deep.equal([]);
                    done();
                });
        });

        it('Number of search results is limited', function(done) {
            const searchLimit = 20;
            const testSubstring = 'Added Term';

			// Need to add more Keywords than the expected limit
            let keywordPromises = _.range(searchLimit * 2).map(i => Keyword.forge({
                name : `${testSubstring} ${i}`,
                external_id : `T${i}`,
                keyword_type_id : testdata.keyword_types[0].id
            }).save());

			// Now do the test with the added Keywords
            Promise.all(keywordPromises).then(() => {
                chai.request(server)
					.get(`/api/keyword/search?substring=${testSubstring}`)
					.end((err, res) => {
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.have.length(searchLimit);
    done();
});
            });
        });

        it('Search result filtered by provided KeywordType', function(done) {
            const testKeywordScope = testdata.keyword_types[1].name;
            const testSubstr = 'Test Term';
            const expectedKeyword = testdata.keywords[2];

            chai.request(server)
				.get(`/api/keyword/search?substring=${testSubstr}&keyword_scope=${testKeywordScope}`)
				.end((err, res) => {
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.have.length(1);
    chai.expect(res.body[0]).to.contain(expectedKeyword);
    done();
});
        });

        it('Obsolete keywords are not shown when searching', function(done) {
            const obsoleteName = 'Test Term Obsolete';
            Keyword.addNew({
                name: obsoleteName,
                type_name: testdata.keyword_types[0].name,
                external_id: '12345',
                is_obsolete: true
            }).then(() => {
                chai.request(server)
					.get('/api/keyword/search?substring=Test Term')
					.end((err, res) => {
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.have.length.above(1);
    res.body.forEach(keyword => {
        chai.expect(keyword).to.not.contain({name: obsoleteName});
    });
    done();
});
            });
        });

        it('Invalid keyword scope responds with an error', function(done) {
            const badKeywordScope = 'Bad scope';
            const testSubstr = 'Test Term';

            chai.request(server)
				.get(`/api/keyword/search?substring=${testSubstr}&keyword_scope=${badKeywordScope}`)
				.end((err, res) => {
    chai.expect(res.status).to.equal(400);
    chai.expect(res.text).to.equal(`Invalid keyword_scope ${badKeywordScope}`);
    done();
});
        });

        it('Well-formed search responds with correct data', function(done) {
            const testKeywordScope = testdata.keyword_types[0].name;
            const testSubstr = 'Test Term 00';
            const expectedKeywords = [
                testdata.keywords[0],
                testdata.keywords[1]
            ];

            chai.request(server)
				.get(`/api/keyword/search?substring=${testSubstr}&keyword_scope=${testKeywordScope}`)
				.end((err, res) => {
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.have.length(expectedKeywords.length);
    chai.expect(res.body).to.containSubset(expectedKeywords);
    done();
});
        });

        it('Keyword search is case insensitive', function(done) {
            const sillyCaseName = 'tESt TErm 001';
            const expectedKeyword = testdata.keywords[0];
            chai.request(server)
				.get(`/api/keyword/search?substring=${sillyCaseName}`)
				.end((err, res) => {
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.have.lengthOf(1);
    chai.expect(res.body[0]).to.contain(expectedKeyword);
    done();
});
        });

        it('Search throws an error when substring is not provided', function(done) {
            const testKeywordScope = testdata.keyword_types[0].name;

            chai.request(server)
				.get(`/api/keyword/search?keyword_scope=${testKeywordScope}`)
				.end((err,res) => {
    chai.expect(res.status).to.equal(400);
    chai.expect(res.text).to.equal(`'substring' is a required field`);
    done();
});
        });

        it('Keyword search will search synonyms', function(done) {
            const synonym = 'T 001 S 001';
            const expectedKeyword = testdata.keywords[0];
            chai.request(server)
				.get(`/api/keyword/search?substring=${synonym}`)
				.end((err, res) => {
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.have.lengthOf(1);
    chai.expect(res.body[0]).to.contain(expectedKeyword);
    chai.expect(res.body[0].synonym).to.equal(synonym);
    done();
});
        });

    });

});
