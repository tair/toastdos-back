'use strict';

const chai = require('chai');
chai.use(require('chai-http'));

const server = require('../../app/index');
const auth = require('../../app/lib/authentication');
const knex = require('../../app/lib/bookshelf').knex;

const testdata = require('../../seeds/test/test_data.json');

describe('Authentication middleware', function() {

    let testToken = '';
    let unauthTestToken = '';

    // Make a token so tests can authenticate
    before('Generate test JWT', function(done) {
        let authenticatedUser = testdata.users[0];
        auth.signToken({
            user_id: authenticatedUser.id
        }, (err, newToken) => {
            chai.expect(err).to.be.null;
            testToken = newToken;
        });
        let unauthenticatedUser = testdata.users[1];
        auth.signToken({
            user_id: unauthenticatedUser.id
        }, (err, unauthNewToken) => {
            chai.expect(err).to.be.null;
            unauthTestToken = unauthNewToken;
            done();
        });
    });

    before('Setup SQLite memory database', function() {
        return knex.migrate.latest();
    });

    beforeEach('Populate SQLite memory DB with fresh test data', function() {
        return knex.seed.run();
    });

    describe('JWT basic authentication', function() {

        it('A well formed authentication header is accepted', function(done) {
            let testUser = testdata.users[0];
            chai.request(server)
                .get(`/api/user/${testUser.id}`)
                .set({
                    Authorization: `Bearer ${testToken}`
                })
                .end((err, res) => {
                    chai.expect(res.status).to.equal(200);
                    done();
                });
        });

        it('Omitting a header for an authenticated request responds with an error', function(done) {
            let testUser = testdata.users[0];
            chai.request(server)
                .get(`/api/user/${testUser.id}`)
                .end((err, res) => {
                    chai.expect(res.status).to.equal(401);
                    chai.expect(res.text).to.equal('No authorization header provided.');
                    done();
                });
        });

        it('A JSON Web Token must be used for authentication', function(done) {
            let testUser = testdata.users[0];
            chai.request(server)
                .get(`/api/user/${testUser.id}`)
                .set({
                    Authorization: 'Some crap that isnt a token'
                })
                .end((err, res) => {
                    chai.expect(res.status).to.equal(401);
                    chai.expect(res.text).to.equal('No authorization token provided in header.');
                    done();
                });
        });

        it('Expired tokens are rejected', function(done) {
            let testUser = testdata.users[0];
            auth.signToken({
                exp: 0,
                data: {
                    user_id: testUser.id
                }
            }, (tokenerr, token) => {
                chai.request(server)
                    .get(`/api/user/${testUser.id}`)
                    .set({
                        Authorization: `Bearer ${token}`
                    })
                    .end((err, res) => {
                        chai.expect(res.status).to.equal(401);
                        chai.expect(res.text).to.equal('JWT expired');
                        done();
                    });
            });
        });

        it('Malformed tokens are rejected', function(done) {
            let testUser = testdata.users[0];
            chai.request(server)
                .get(`/api/user/${testUser.id}`)
                .set({
                    Authorization: 'Bearer garbagetoken'
                })
                .end((err, res) => {
                    chai.expect(res.status).to.equal(401);
                    chai.expect(res.text).to.equal('JWT malformed');
                    done();
                });
        });

    });

    describe('User authentication', function() {

        it('Successfully retrieves user whose ID matches ID in JWT', function(done) {
            let testUser = testdata.users[0];
            chai.request(server)
                .get(`/api/user/${testUser.id}`)
                .set({
                    Authorization: `Bearer ${testToken}`
                })
                .end((err, res) => {
                    chai.expect(res.status).to.equal(200);
                    chai.expect(res.body).to.contain(testUser);
                    done();
                });
        });

        it('Cannot retrieve a user whose ID doesnt match ID in JWT', function(done) {
            let testUser = testdata.users[0];
            auth.signToken({
                user_id: 'fakeid'
            }, (tokenerr, token) => {
                chai.request(server)
                    .get(`/api/user/${testUser.id}`)
                    .set({
                        Authorization: `Bearer ${token}`
                    })
                    .end((err, res) => {
                        chai.expect(res.status).to.equal(401);
                        done();
                    });
            });
        });

    });

    describe('Curator authentication', function() {

        it('Users without the Curator role are unauthorized', function(done) {
            chai.request(server)
                .get(`/api/submission/list`)
                .set({
                    Authorization: `Bearer ${unauthTestToken}`
                })
                .end((err, res) => {
                    chai.expect(res.status).to.equal(401);
                    chai.expect(res.text).to.equal('Only Curators may access this resource');
                    done();
                });
        });

    });

    describe('Researcher authentication', function() {

        it('Users without the Researcher role are unauthorized', function() {
            return chai.request(server)
                .post(`/api/submission/`)
                .set({
                    Authorization: `Bearer ${unauthTestToken}`
                })
                .catch(err => {
                    chai.expect(err.response.status).to.equal(401);
                    chai.expect(err.response.text).to.equal('Only Researchers may access this resource');
                })
                .then(res => chai.expect(res).to.not.exist);
        });

    });

});