'use strict';

const chai = require('chai');
chai.use(require('chai-subset'));
const knex = require('../../app/lib/bookshelf').knex;

const locusHelper = require('../../app/lib/locus_submission_helper');

const Locus     = require('../../app/models/locus');
const LocusName = require('../../app/models/locus_name');

const testdata = require('../../seeds/test_data.json');

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

		// Make sure the database is up to date
		before(function() {
			return knex.migrate.latest();
		});

		// Give us fresh test data in a sqlite memory database for each test
		beforeEach(function() {
			return knex.seed.run();
		});

		it('Totally new loci create all proper records', function() {
			const locusName = 'Q6XXX8';
			const locusSymbol = 'Fox';
			const locusFullname = 'Jupiter the Red Fox';
			const submitterId = 1;

			const expectedSource = {name: 'Uniprot'};
			const expectedLocusName = { locus_name: locusName };
			const expectedGeneSymbol = {
				symbol: locusSymbol,
				full_name: locusFullname
			};
			const expectedTaxon = {
				name: 'Vulpes vulpes',
				taxon_id: 9627
			};

			return locusHelper.addLocusRecords(locusName, locusFullname, locusSymbol, submitterId)
				.then(createdLocusName => {
					let createdLocusId = createdLocusName.related('locus').attributes.id;

					return Locus.where({id: createdLocusId})
						.fetch({withRelated: ['taxon', 'names', 'symbols']})
						.then(res => {
							let actual = res.toJSON();
							chai.expect(actual.taxon).to.contain(expectedTaxon);
							chai.expect(actual.names[0]).to.contain(expectedLocusName);
							chai.expect(actual.symbols[0]).to.contain(expectedGeneSymbol);

							return LocusName.where({id: actual.names[0].id}).fetch({withRelated: 'source'});
						})
						.then(res => {
							let actual = res.toJSON();
							chai.expect(actual.source).to.contain(expectedSource);
						});
				});
		});

		it('Creating new Loci and updating existing Loci return the same values', function() {
			const locusName = 'Q6XXX8';
			const locusSymbol = 'Fox';
			const locusFullname = 'Jupiter the Red Fox';
			const submitterId = 1;

			return locusHelper.addLocusRecords(locusName, locusFullname, locusSymbol, submitterId)
				.then(addedLocus => locusHelper.addLocusRecords(locusName, locusFullname, locusSymbol, submitterId)
					.then(modifiedLocus => {
						chai.expect(addedLocus.toJSON()).to.deep.equal(modifiedLocus.toJSON());
					})
				);
		});

		it('New symbols for existing loci are created', function() {
			const existingLocusName = testdata.locus_name[1];
			const existingGeneSymbol = testdata.gene_symbol[2];
			const newSubmitter = testdata.users[1];
			const newFullName = 'New fullname';
			const newSymbol = 'NFN';

			const expectedGeneSymbols = [
				existingGeneSymbol,
				{
					symbol : newSymbol,
					full_name : newFullName
				}
			];

			return locusHelper.addLocusRecords(existingLocusName.locus_name, newFullName, newSymbol, newSubmitter.id)
				.then(modifiedLocus => {
					return Locus.where({id: modifiedLocus.related('locus').attributes.id})
						.fetch({withRelated: 'symbols'})
						.then(res => {
							let actual = res.toJSON();
							chai.expect(actual.symbols).to.containSubset(expectedGeneSymbols);
						});
				});
		});

		it('Invalid locus does not create records');

	});

});
