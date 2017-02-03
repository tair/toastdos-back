'use strict';

const chai = require('chai');
chai.use(require('chai-subset'));

const Tair = require('../../app/lib/tair_api');

describe('TAIR API', function() {

	it('Non-existing Locus name returns an error', function() {
		const badLocusName = 'AT1';
		return Tair.getLocusByName(badLocusName).then(locus => {
			throw new Error('Did not reject promise with bad Locus name');
		}).catch(err => {
			chai.expect(err.message).to.equal(`No Locus found for name ${badLocusName}`);
		});
	});

	it('Existing Locus name returns successfully', function() {
		const goodLocusName = 'AT1G10000';

		// We use a cut down version of the data so the test still works if this response data changes
		const expectedResponse = {
			locusName: 'AT1G10000',
			taxon: 'Arabidopsis thaliana'
		};

		return Tair.getLocusByName(goodLocusName).then(locus => {
			chai.expect(locus).to.containSubset(expectedResponse);
		});
	});

	it('Total list of symbols returns successfully', function() {
		// This thing just takes a while to respond. It's a lot of data.
		this.timeout(5000);

		// The total number of entries probably changes all the time,
		// so we'll just make sure we're getting several results.
		const THIS_MANY = 10;

		return Tair.getAllSymbols().then(symbolList => {
			chai.expect(symbolList).to.be.an('Array');
			chai.expect(symbolList.length).to.be.at.least(THIS_MANY);
		});
	});

	it('Non-existing symbol returns an error', function() {
		const badSymbol = 'FAKE';
		return Tair.getSymbolsByName(badSymbol).then(symbols => {
			throw new Error('Non-existing symbol did not throw an error');
		}).catch(err => {
			chai.expect(err.message).to.equal(`No Loci for symbol ${badSymbol}`);
		});
	});

	it('Existing symbol returns array of Loci', function() {
		const goodSymbol = 'PAP1';
		const expectedElement = {
			symbolName: 'PAP1',
			symbolFullName: 'PHYTOCHROME-ASSOCIATED PROTEIN 1',
			locusName: 'AT3G16500'
		};

		return Tair.getSymbolsByName(goodSymbol).then(symbols => {
			chai.expect(symbols).to.be.an('Array');
			chai.expect(symbols.length).to.be.above(1);
			chai.expect(symbols).to.contain(expectedElement);
		});
	});

});
