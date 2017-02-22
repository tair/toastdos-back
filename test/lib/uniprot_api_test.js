'use strict';

const chai = require('chai');

const Uniprot = require('../../app/lib/uniprot_api');

describe('Uniprot API', function () {

	it('Whole existing ID returns single Gene', function() {
		const validId = 'Q6XXX8';
		const expectedLocus = {
			source: 'Uniprot',
			locus_name: validId,
			taxon_name: 'Vulpes vulpes',
			taxon_id: 9627
		};

		return Uniprot.getLocusByName(validId).then(result => {
				chai.expect(result).to.deep.equal(expectedLocus);
			}).catch(err => {
				throw err;
			});
	});

	it('Partial existing ID causes error due to multiple results', function() {
		const validPartialId = 'Q131';
		return Uniprot.getLocusByName(validPartialId).then(result => {
			throw new Error('Did not reject when getting multiple values');
		}).catch(err => {
			chai.expect(err.message).to.equal('Given ID matches multiple loci');
		});
	});

	it('Non-existing name causes error due to no records', function() {
		const fakeName = 'fakename';
		return Uniprot.getLocusByName(fakeName).then(result => {
			throw new Error('Returned a gene for a fake name');
		}).catch(err => {
			chai.expect(err.message).to.equal(`No Locus found for name ${fakeName}`);
		});
	});

	it('Gene queries return a limited list of data', function() {
		const requestLimit = 10;
		const genericName = 'butter';
		return Uniprot.searchGeneByName(genericName).then(result => {
			chai.expect(result).to.have.length(requestLimit);
		}).catch(err => {
			throw err;
		});
	});

	it('Gene queries that return no results causes error', function() {
		const nonMatchingName = 'randomthing';
		return Uniprot.searchGeneByName(nonMatchingName).then(result => {
			throw new Error('Did not reject when search returned no values');
		}).catch(err => {
			chai.expect(err.toString()).to.contain('Given query matches no genes');
		});
	});

});
