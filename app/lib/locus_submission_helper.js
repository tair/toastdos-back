'use strict';

const Bluebird = require('bluebird'); // for Promise.any()

const Uniprot   = require('../lib/uniprot_api');
const RNACental = require('../lib/rna_central_api');
const TAIR      = require('../lib/tair_api');

const Locus      = require('../models/locus');
const LocusName  = require('../models/locus_name');
const GeneSymbol = require('../models/gene_symbol');
const Taxon      = require('../models/taxon');
const Source     = require('../models/external_source');

// ex: AT1G10000
const TAIR_NAME_REGEX        = /^AT(?:\d|C|M)G\d{5}$/;

// ex: URS00000EF184
const RNA_CENTRAL_NAME_REGEX = /^(URS[0-9a-fA-F]{10})$/;

// ex: A2BC19
//     P12345
//     A0A022YWF9
const UNIPROT_NAME_REGEX     = /^[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/;

/**
 * Adds all of the records for a Locus. Creates records in the
 * Taxon, Locus, LocusName, GeneSymbol, and ExternalSource tables.
 * When a Locus is already present in our system, we just add a
 * new record for the 'Alias' (the combination of symbol and full name).
 *
 * @param name - Name of Locus, like AT1G10001
 * @param fullName - Full name of Locus, like 'Curly Leaf'
 * @param symbol - Symbol for Locus, like 'CLF'
 * @param submitter - ID of user submitting this Locus
 * @return a promise that resolves with the LocusName with related Locus.
 */
function addLocusRecords(name, fullName, symbol, submitter) {

	// Try to find an existing record for this locus
	return LocusName.where({locus_id: name})
		.fetch({withRelated: ['locus', 'source']})
		.then(existingLocusName => {
			if (existingLocusName) {
				/* Even if this locus exists in our system,
				 * we may still need to add a new alias for it (i.e. symbol and fullname) */
				return GeneSymbol.where({
					full_name: fullName,
					symbol: symbol
				})
					.fetch()
					.then(existingAlias => {
						if (existingAlias) return Promise.resolve(existingLocusName);
						else return GeneSymbol.forge({
							locus_id: existingLocusName.related('locus').attributes.id,
							source_id: existingLocusName.related('source').attributes.name,
							submitter_id: submitter,
							full_name: fullName,
							symbol: symbol
						})
							.save()
							.then(() => Promise.resolve(existingLocusName));
					});
			}
			else {
				// Go through the whole process of adding a new Locus record
				return verifyLocus(name).then(locusData => {
					return addOrGetTaxon(locusData.taxon_id, locusData.taxon_name)
						.then(taxon => Promise.all([
							addOrGetSource(locusData.source),
							Locus.forge({taxon_id: taxon.attributes.id}).save()
						]))
						.then(([source, locus]) => {
							let namePromise = LocusName.forge({
								source_id: source.attributes.id,
								locus_id: locus.attributes.id,
								locus_name: locusData.locus_name
							}).save();

							let symbolPromise = GeneSymbol.forge({
								source_id: source.attributes.id,
								locus_id: locus.attributes.id,
								submitter_id: submitter,
								symbol: symbol,
								full_name: fullName
							}).save();

							return Promise.all([namePromise, symbolPromise]);
						})
						.then(() => {
							/* Fetch the records we just added so our return data is consistent
							 * with what we return when the Locus already exists. */
							return LocusName.where({locus_name: name}).fetch({withRelated: 'locus'});
						});
				});
			}
		});
}

/**
 * Retrieves the existing taxon that matches the given id,
 * or creates a new taxon record with the given data.
 * Returns a promise that resolves with a Taxon object.
 */
function addOrGetTaxon(taxonId, taxonName) {
	return Taxon.where({taxon_id: taxonId})
		.fetch()
		.then(existingTaxon => {
			if (existingTaxon) return Promise.resolve(existingTaxon);
			else return Taxon.forge({
				taxon_id: taxonId,
				name: taxonName
			}).save();
		});
}

/**
 * Retrieves existing external source record for the given name,
 * or creates a new one.
 * Returns a promise that resolves with a Source object.
 */
function addOrGetSource(name) {
	return Source.where({name: name})
		.fetch()
		.then(existingSource => {
			if (existingSource) return Promise.resolve(existingSource);
			else return Source.forge({name: name}).save();
		});
}

/**
 * Verifies the external source of a Gene.
 *
 * We guess the source of the given Locus name and check that source first.
 * If we can't find the Locus there, we fall back to checking the other sources.
 * This is an optimization to speed up validation.
 *
 * Returns a promise that either resolves with the found locus,
 * or rejects with an error message.
 */
function verifyLocus(name) {
	let locusLookup;
	let locusLookupFallback1;
	let locusLookupFallback2;
	let locusLookupFallback3;

	// Use Locus name to Guess which external source we should query first
	if (name.match(TAIR_NAME_REGEX)) {
		locusLookup = TAIR.getLocusByName;
		locusLookupFallback1 = RNACental.getLocusByName;
		locusLookupFallback2 = Uniprot.getLocusByName;
	}
	else if (name.match(RNA_CENTRAL_NAME_REGEX)) {
		locusLookup = RNACental.getLocusByName;
		locusLookupFallback1 = TAIR.getLocusByName;
		locusLookupFallback2 = Uniprot.getLocusByName;
	}
	else if (name.match(UNIPROT_NAME_REGEX)) {
		locusLookup = Uniprot.getLocusByName;
		locusLookupFallback1 = TAIR.getLocusByName;
		locusLookupFallback2 = RNACental.getLocusByName;
	}
	else {
		locusLookupFallback1 = TAIR.getLocusByName;
		locusLookupFallback2 = Uniprot.getLocusByName;
		locusLookupFallback3 = RNACental.getLocusByName;
	}

	return new Promise((resolve, reject) => {

		// Check the guessed Locus source first
		if (locusLookup) {
			locusLookup(name)
				.then(locus => resolve(locus))
				.catch(err => {
					if (err.message.includes('No Locus found')) {
						return Bluebird.any([
							locusLookupFallback1(name),
							locusLookupFallback2(name)
						]);
					} else {
						reject(err);
					}
				})
				.then(locus => resolve(locus))
				.catch(aggregateError => {
					if (aggregateError.every(err => err.message.includes('No Locus found'))) {
						reject(new Error(`No Locus found for name ${name}`));
					} else {
						reject(err);
					}
				});
		}
		else {
			// If we can't reliably guess a source, just search all our external sources for the Locus.
			Bluebird.any([
				locusLookupFallback1(name),
				locusLookupFallback2(name),
				locusLookupFallback3(name)
			])
				.then(locus => resolve(locus))
				.catch(aggregateError => {
					if (aggregateError.every(err => err.message.includes('No Locus found'))) {
						reject(new Error(`No Locus found for name ${name}`));
					} else {
						reject(err);
					}
				});
		}
	});
}

module.exports = {
	addLocusRecords,
	verifyLocus
};
