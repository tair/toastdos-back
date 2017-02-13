'use strict';

const chai = require('chai');

const NCBI = require('../../app/lib/ncbi_api');

describe('NCBI API', function() {

	it('Good Taxon ID successfully returns scientific name', function() {
		const goodTaxonId = 77133;
		const expectedData = {
			taxId: 77133,
			scientificName: 'uncultured bacterium'
		};

		return NCBI.getTaxonInfo(goodTaxonId).then(info => {
			chai.expect(info).to.contain(expectedData);
		});
	});

	it('Bad Taxon ID responds with error', function() {
		const badTaxonId = 99999999;
		return NCBI.getTaxonInfo(badTaxonId).then(info => {
			throw new Error('Returned', info);
		}).catch(err => {
			chai.expect(err.message).to.equal(`No Taxon matches id ${badTaxonId}`);
		});
	});

});
