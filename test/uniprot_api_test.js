"use strict";

const chai = require('chai');

const Uniprot = require('../app/lib/uniprot_api');

describe('Uniprot API', function () {

	it('Whole existing ID returns single Gene', function() {
		const validId = 'Q13137';
		return Uniprot.getGeneById(validId).then(result => {
				chai.expect(result).to.be.an('object');
				chai.expect(result.id).to.equal(validId);
			}).catch(err => {
				throw err;
			});
	});

	it('Partial existing ID causes error due to multiple results', function() {
		const validPartialId = 'Q131';
		return Uniprot.getGeneById(validPartialId).then(result => {
			throw new Error('Did not reject when getting multiple values');
		}).catch(err => {
			chai.expect(err.toString()).to.contain('Given ID matches multiple genes');
		});
	});

	it('Non-existing ID causes error due to no records', function() {
		const fakeId = 'fakeid';
		return Uniprot.getGeneById(fakeId).then(result => {
			throw new Error('Returned a gene for a fake ID');
		}).catch(err => {
			chai.expect(err.toString()).to.contain('ID matches no genes');
		});
	});

});
