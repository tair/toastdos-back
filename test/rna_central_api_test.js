'use strict';

const chai = require('chai');

const RNACentral = require('../app/lib/rna_central_api');

describe('RNA Central API', function () {

	it('Bad Locus name responds with error', function() {
		const badLocusName = 'URS';
		return RNACentral.getGeneByName(badLocusName).then(result => {
			throw new Error('Successfully returned with a bad Locus name');
		}).catch(err => {
			chai.expect(err.message).to.equal(`Locus name ${badLocusName} matches no genes`);
		});
	});

	it('Good Locus name responds successfully', function() {
		const goodLocusName = 'URS0000000018';
		const expectedSubset = { rnacentral_id: 'URS0000000018' };
		return RNACentral.getGeneByName(goodLocusName).then(result => {
			chai.expect(result).to.contain(expectedSubset);
		}).catch(err => {
			throw err;
		});
	});

});