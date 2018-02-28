'use strict';

const Bluebird = require('bluebird'); // for Promise.any()

const Uniprot = require('../lib/uniprot_api');
const RNACental = require('../lib/rna_central_api');
const TAIR = require('../lib/tair_api');

const LocusName = require('../models/locus_name');
const GeneSymbol = require('../models/gene_symbol');

// ex: AT1G10000
const TAIR_NAME_REGEX = /^AT(?:\d|C|M)G\d{5}$/;

// ex: URS00000EF184
const RNA_CENTRAL_NAME_REGEX = /^(URS[0-9a-fA-F]{10})$/;

// ex: A2BC19
//     P12345
//     A0A022YWF9
const UNIPROT_NAME_REGEX = /^[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/;

/**
 * Adds all of the records for a Locus. Creates records in the
 * Taxon, Locus, LocusName, GeneSymbol, and ExternalSource tables.
 * When a Locus is already present in our system, we just add a
 * new record for the 'Alias' (the combination of symbol and full name).
 *
 * @param locus - Hash of parameters
 *     name - Name of Locus, like AT1G10001
 *     full_name - Full name of Locus, like 'Curly Leaf'
 *     symbol - Symbol for Locus, like 'CLF'
 *     submitter_id - ID of user submitting this Locus
 * @param transaction - optional transaction for adding these records
 * @return a promise that resolves with the LocusName with related Locus.
 */
function addLocusRecords(locus, transaction) {
    // Try to find an existing record for this locus
    return LocusName.getByNameWithRelated(locus.name, transaction)
        .then(existingLocusName => {
            if (existingLocusName) {
                return Promise.resolve(existingLocusName);
            } else {
                return verifyLocus(locus.name).then(locusData => {
                    return LocusName.addNew(locusData, transaction);
                }).then(locusName => locusName.fetch({
                    withRelated: ['locus', 'source'],
                    transacting: transaction
                }));
            }
        })
        .then(locusName => {
            // New GeneSymbols can be added for existing Loci
            let symbolPromise;
            if (locus.full_name || locus.symbol) {
                symbolPromise = GeneSymbol.addOrGet({
                    full_name: locus.full_name,
                    symbol: locus.symbol,
                    submitter_id: locus.submitter_id,
                    locus_id: locusName.get('locus_id'),
                    source_id: locusName.get('source_id')
                }, transaction);
            } else {
                symbolPromise = Promise.resolve(null);
            }

            return Promise.all([Promise.resolve(locusName), symbolPromise]);
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
    } else if (name.match(RNA_CENTRAL_NAME_REGEX)) {
        locusLookup = RNACental.getLocusByName;
        locusLookupFallback1 = TAIR.getLocusByName;
        locusLookupFallback2 = Uniprot.getLocusByName;
    } else if (name.match(UNIPROT_NAME_REGEX)) {
        locusLookup = Uniprot.getLocusByName;
        locusLookupFallback1 = TAIR.getLocusByName;
        locusLookupFallback2 = RNACental.getLocusByName;
    } else {
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
                        reject(aggregateError);
                    }
                });
        } else {
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
                        reject(aggregateError);
                    }
                });
        }
    });
}

module.exports = {
    addLocusRecords,
    verifyLocus
};