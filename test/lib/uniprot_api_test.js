'use strict';

const chai = require('chai');

const Uniprot = require('../../app/lib/uniprot_api');

describe('Uniprot API', function () {

	it('Whole existing ID returns single Gene', function() {
		const validId = 'Q13137';
		return Uniprot.getLocusByName(validId).then(result => {
				chai.expect(result).to.be.an('object');
				chai.expect(result.id).to.equal(validId);
			}).catch(err => {
				throw err;
			});
	});

	it('Partial existing ID causes error due to multiple results', function() {
		const validPartialId = 'Q131';
		return Uniprot.getLocusByName(validPartialId).then(result => {
			throw new Error('Did not reject when getting multiple values');
		}).catch(err => {
			chai.expect(err.toString()).to.contain('Given ID matches multiple genes');
		});
	});

	it('Non-existing name causes error due to no records', function() {
		const fakeName = 'fakename';
		return Uniprot.getLocusByName(fakeName).then(result => {
			throw new Error('Returned a gene for a fake name');
		}).catch(err => {
			chai.expect(err.toString()).to.equal(`No Locus found for name ${fakeName}`);
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
