"use strict";

const chai = require('chai');

const validator = require('../app/lib/publication_id_validator');

describe('Publication ID Validator', function() {

	it('Existing Pubmed IDs returns success', function() {
		const realPubmedId = 999999;
		return validator.validatePubmedId(realPubmedId)
			.catch(() => {
				throw new Error('Valid Pubmed ID should not cause error');
			});
	});

	it('Non-existing Pubmed ID throws error', function(done) {
		const badPubmedId = 999999999;
		validator.validatePubmedId(badPubmedId)
			.then(() => {
				throw new Error('Invalid Pubmed ID should not return successfully');
			})
			.catch(() => done());
	});

	it('Existing DOI returns success');

	it('Non-existing DOI throws error');

});
