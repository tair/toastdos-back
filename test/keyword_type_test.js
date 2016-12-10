"use strict";

const chai = require('chai');
chai.use(require('chai-http'));

const server = require('../app');
const knex    = require('../app/lib/bookshelf').knex;

const testdata = require('../seeds/test_data.json');


describe('KeywordType Controller', function() {

    before('Setup SQLite memory database', function() {
        return knex.migrate.latest();
    });

    beforeEach('Populate SQLite memory DB with fresh test data', function() {
        return knex.seed.run();
    });
    describe('GET /api/keywordtypes/', function(){

        it('Successfully retrieves KeywordType by id in the database', function(done) {
            let testKeywordTypes = testdata.keyword_types;
            
            chai.request(server)
                .get('/api/keywordtypes/' + testKeywordTypes)
                .end((err, res) => {
                    chai.expect(res.status).to.equal(200);
                    chai.expect(res.body).to.contain(testKeywordTypes);
                    done();
                });
        });
    });  
    

});
