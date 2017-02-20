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

		it('Correctly identifies Uniprot Locus name', function() {
			const uniprotLocus = 'Q6XXX8';
			const expectedSource = 'Uniprot';
			return locusHelper.verifyLocus(uniprotLocus).then(locus => {
				chai.expect(locus.source).to.equal(expectedSource);
			});
		});

		it('Correctly identifies RNA Central Locus name', function() {
			const rnaLocus = 'URS0000000018';
			const expectedSource = 'RNA Central';
			return locusHelper.verifyLocus(rnaLocus).then(locus => {
				chai.expect(locus.source).to.equal(expectedSource);
			});
		});

		// FIXME I have no idea how to test this, but it's really something we should test
		it('Falls back to other sources when guessed source does not contain locus name');

		it('Totally non-existent Locus name responds with error', function() {
			const fakeLocus = 'FakeLocus';
			return locusHelper.verifyLocus(fakeLocus).then(locus => {
				throw new Error('Somehow found the fake locus');
			}).catch(err => {
				chai.expect(err.message).to.equal(`No Locus found for name ${fakeLocus}`);
			});
		});

	});

	describe('Add Locus', function() {

		it('Totally new loci create all proper records');

		it('New symbols for existing loci are created');

		it('Invalid locus does not create records');

	});

});
