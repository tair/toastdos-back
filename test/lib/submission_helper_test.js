'use strict';

const chai = require('chai');
chai.use(require('chai-subset'));

const locusHelper = require('../../app/lib/locus_submission_helper');

describe('TAIR API', function() {

	describe('Verify Locus', function() {

		it('Correctly identifies TAIR Locus name', function() {
			const tairLocus = 'AT1G10000';
			const expectedSource = 'TAIR';
			return locusHelper.verifyLocus(tairLocus).then(locus => {
				chai.expect(locus.source).to.equal(expectedSource);
			});
		});

		it('Correctly identifies Uniprot Locus name');

		it('Correctly identifies RNA Central Locus name');

		it('Falls back to other sources when guessed source does not contain locus name');

		it('Totally nonexistant Locus name responds with error');
	});

	describe('Add Locus', function() {

		it('Totally new loci create all proper records');

		it('New symbols for existing loci are created');

		it('Invalid locus does not create records');

	});

});
