'use strict';

const chai = require('chai');
chai.use(require('chai-http'));

const server = require('../../app/index');

describe('Publication Controller', function() {

    describe('POST /api/publication/', function() {

        it('Successfully retrieves DOI information', function(done) {
            const testDOI = '10.1594/GFZ.GEOFON.gfz2009kciu';
            const expectedResponse = {
                type: 'doi',
                url: 'http://geofon.gfz-potsdam.de/db/eqpage.php?id=gfz2009kciu'
            };

            chai.request(server)
				.post('/api/publication/')
				.send({publication_id: testDOI})
				.end((err, res) => {
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal(expectedResponse);
    done();
});
        });

        it('Non-existing DOI responds with error', function(done) {
            const testDOI = '10.1234/IM.A.FAKE.DOI';

            chai.request(server)
				.post('/api/publication/')
				.send({publication_id: testDOI})
				.end((err, res) => {
    chai.expect(res.status).to.equal(404);
    chai.expect(res.text).to.equal(`DOI '${testDOI}' did not match any publications`);
    done();
});
        });

        it('Successfully retrieves Pubmed ID information', function(done) {
            const testPubmedID = 999999;
            const expectedResponse = {
                type: 'pubmed_id',
                author: 'Kleinfeld RG',
                title: 'Intercellular junctions between decidual cells in the growing deciduoma of the pseudopregnant rat uterus.'
            };

            chai.request(server)
				.post('/api/publication/')
				.send({publication_id: testPubmedID})
				.end((err, res) => {
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal(expectedResponse);
    done();
});
        });

        it('Non-existing Pubmed ID responds with error', function(done) {
            const testPubmedID = 999999999;

            chai.request(server)
				.post('/api/publication/')
				.send({publication_id: testPubmedID})
				.end((err, res) => {
    chai.expect(res.status).to.equal(404);
    chai.expect(res.text).to.equal(`Pubmed ID '${testPubmedID}' did not match any publications`);
    done();
});
        });

    });

});
