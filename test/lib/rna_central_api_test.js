'use strict';

const chai = require('chai');

const RNACentral = require('../../app/lib/rna_central_api');

describe('RNA Central API', function () {

	it('Bad Locus name responds with error', function() {
		const badLocusName = 'URS';
		return RNACentral.getLocusByName(badLocusName).then(result => {
			throw new Error('Successfully returned with a bad Locus name');
		}).catch(err => {
			chai.expect(err.message).to.equal(`No Locus found for name ${badLocusName}`);
		});
	});

	it('Good Locus name responds successfully', function() {
		const goodLocusName = 'URS0000000018';
		const expectedResponse = {
			source: 'RNA Central',
			locus_name: goodLocusName,
			taxon_id: 77133,
			taxon_name: 'uncultured bacterium'
		};

		return RNACentral.getLocusByName(goodLocusName).then(result => {
			chai.expect(result).to.deep.equal(expectedResponse);
		}).catch(err => {
			throw err;
		});
	});

});