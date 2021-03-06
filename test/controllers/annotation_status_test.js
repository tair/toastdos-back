'use strict';

const chai = require('chai');
chai.use(require('chai-http'));
chai.use(require('chai-subset'));

const server = require('../../app/index');
const knex = require('../../app/lib/bookshelf').knex;

const testdata = require('../../seeds/test/test_data.json');


describe('Annotation Status Controller', function() {

    before('Setup SQLite memory database', function() {
        return knex.migrate.latest();
    });

    beforeEach('Populate SQLite memory DB with fresh test data', function() {
        return knex.seed.run();
    });

    describe('GET /api/annotationstatus/', function() {

        it('Successfully retrieves all statuses', function(done) {
            chai.request(server)
                .get('/api/annotationstatus/')
                .end((err, res) => {
                    chai.expect(res.status).to.equal(200);
                    chai.expect(res.body).to.containSubset(testdata.annotation_statuses);
                    done();
                });
        });
    });

});