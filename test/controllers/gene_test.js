'use strict';

const chai = require('chai');
chai.use(require('chai-http'));

const server = require('../../app/index');


describe('Gene Controller', function() {

    describe('GET /api/gene/verify/:name', function() {

        it('Successfully retrieves a single Gene from Uniprot', function(done) {
            const uniprotGeneName = 'Q6XXX8';
            const expectedBody = {
                source: 'Uniprot',
                locus_name: uniprotGeneName,
                taxon_name: 'Vulpes vulpes',
                taxon_id: 9627
            };

            chai.request(server)
				.get(`/api/gene/verify/${uniprotGeneName}`)
				.end((err, res) => {
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal(expectedBody);
    done();
});
        });

        it('Successfully retrieves a single Gene from RNA Central', function(done) {
            const rnaGeneName = 'URS0000000018';
            const expectedResponse = {
                source: 'RNA Central',
                locus_name: rnaGeneName,
                taxon_id: 77133,
                taxon_name: 'uncultured bacterium'
            };

            chai.request(server)
				.get(`/api/gene/verify/${rnaGeneName}`)
				.end((err, res) => {
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal(expectedResponse);
    done();
});
        });

        it('Successfully retrieves a single Gene from TAIR', function(done) {
            const tairGeneName = 'AT1G10000';
            const expectedResponse = {
                source: 'TAIR',
                locus_name: tairGeneName,
                taxon_name: 'Arabidopsis thaliana',
                taxon_id: 3702
            };

            chai.request(server)
				.get(`/api/gene/verify/${tairGeneName}`)
				.end((err, res) => {
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal(expectedResponse);
    done();
});
        });

        it('A name that returns no values responds with Not Found', function(done) {
            let badGeneName = 'Totally Fake Gene';
            chai.request(server)
				.get(`/api/gene/verify/${badGeneName}`)
				.end((err, res) => {
    chai.expect(res.status).to.equal(404);
    chai.expect(res.text).to.equal(`No Locus found for name ${badGeneName}`);
    done();
});
        });

    });

});
