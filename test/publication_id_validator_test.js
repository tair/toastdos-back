"use strict";

const chai = require('chai');

const validator = require('../app/lib/publication_id_validator');

describe('Publication ID Validator', function() {

	describe('External Services', function() {

		it('Existing Pubmed IDs returns success', function() {
			const realPubmedId = 999999;
			return validator.validatePubmedId(realPubmedId)
				.catch(() => {
					throw new Error('Valid Pubmed ID threw an error');
				});
		});

		it('Non-existing Pubmed ID throws error', function(done) {
			const badPubmedId = 999999999;
			validator.validatePubmedId(badPubmedId)
				.then(() => {
					throw new Error('Invalid Pubmed ID returned successfully');
				})
				.catch(() => done());
		});

		it('Existing DOI returns success', function() {
			const realDOI = '10.1594/GFZ.GEOFON.gfz2009kciu';
			return validator.validateDOI(realDOI)
				.catch(() => {
					throw new Error('Valid DOI threw an error');
				});
		});

		it('Non-existing DOI throws error', function(done) {
			const badDOI = '10.1234/IM.A.FAKE.DOI';
			validator.validateDOI(badDOI)
				.then(() => {
					throw new Error('Invalid DOI returned successfully');
				})
				.catch(() => done());
		});

	});

	describe('Basic validators', function() {

		it('Well-formed Pubmed ID is valid', function() {
			const goodPmid = 1234567;
			chai.expect(validator.isPubmedId(goodPmid)).to.be.true;
		});

		it('Malformed Pubmed ID is invalid', function() {
			const malformedPmid = '12ab3456';
			chai.expect(validator.isPubmedId(malformedPmid)).to.be.false;
		});

		it('Well-formed DOI is valid', function() {
			const goodDOI = '10.1594/GFZ.GEOFON.gfz2009kciu';
			chai.expect(validator.isDOI(goodDOI)).to.be.true;
		});

		it('Malformed DOI is invalid', function() {
			const malformedDOI = '9.1/a bcd';
			chai.expect(validator.isDOI(malformedDOI)).to.be.false;
		});

	});

});
