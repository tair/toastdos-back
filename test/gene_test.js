"use strict";

const chai = require('chai');
chai.use(require('chai-http'));

const server = require('../app');


describe('Gene Controller', function() {

	describe('GET /api/gene/name/:name', function() {

		it('Successfully retrieves a single Gene from Uniprot', function(done) {
			let realGeneName = 'Putative uncharacterized protein DKFZp469E1714';
			chai.request(server)
				.get(`/api/gene/name/${realGeneName}`)
				.end((err, res) => {
					chai.expect(res.status).to.equal(200);
					chai.expect(res.body).to.be.a('object');
					//chai.expect(res.body).to.contain(realGeneName);
					done();
				});
		});

		// TODO intentionally unimplemented for now
		it('Successfully retrieves a single Gene from RNA Central');

		it('Multiple results responds with Bad Request', function(done) {
			let partialGeneName = 'Amyloid beta A4 protein';
			chai.request(server)
				.get(`/api/gene/name/${partialGeneName}`)
				.end((err, res) => {
					chai.expect(res.status).to.equal(400);
					chai.expect(res.text).to.equal('Given query matches multiple genes');
					done();
				});
		});

		it('A name that returns no values responds with Not Found', function(done) {
			let badGeneName = 'Totally Fake Gene';
			chai.request(server)
				.get(`/api/gene/name/${badGeneName}`)
				.end((err, res) => {
					chai.expect(res.status).to.equal(404);
					chai.expect(res.text).to.equal('Given query matches no genes');
					done();
				});
		});

	});

});
