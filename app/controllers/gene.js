'use strict';

const Bluebird = require('bluebird'); // for Promise.any()

const response  = require('../lib/responses');
const Uniprot   = require('../lib/uniprot_api');
const RNACental = require('../lib/rna_central_api');
const TAIR      = require('../lib/tair_api');

// ex: AT1G10000
const TAIR_NAME_REGEX        = /^AT(\d|C|M)G\d{5}$/;

// ex: URS00000EF184
const RNA_CENTRAL_NAME_REGEX = /^(URS[0-9a-fA-F]{10})$/;

// ex: A2BC19
//     P12345
//     A0A022YWF9
const UNIPROT_NAME_REGEX     = /^[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/;

/**
 * Search external resources for a Gene by its full name.
 *
 * We guess the source of the given Locus name and check that source first.
 * If we can't find the Locus there, we fall back to checking the other sources.
 * This is an optimization to speed up validation.
 *
 * Responds with an 200 if we get a single result.
 * Responds with a 404 if we find nothing.
 *
 * @param  {Express.Request}   req  - the request object
 * @param  {Express.Response}   res  - the response object
 * @param  {Function} next - pass to next route handler
 */
function getByFullName(req, res, next) {
	let locusLookup;
	let locusLookupFallback1;
	let locusLookupFallback2;
	let locusLookupFallback3;

	let name = req.params.name;

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

	// Check the guessed Locus source first
	if (locusLookup) {
		return locusLookup(name)
			.then(locus => response.ok(res, locus))
			.catch(err => {
				if (err.contains('No Locus found')) {
					return Bluebird.any([
						locusLookupFallback1(name),
						locusLookupFallback2(name)
					]);
				} else {
					response.defaultServerError(res, err);
				}
			})
			.then(locus => response.ok(res, locus))
			.catch(aggregateError => {
				if (aggregateError.every(err => err.contains('No Locus found'))) {
					response.notFound(res, `No Locus found for name ${name}`);
				} else {
					response.defaultServerError(res, err);
				}
			});
	}
	else {
		// If we can't reliably guess a source, just search all our external sources for the Locus.
		return Bluebird.any([
			locusLookupFallback1(name),
			locusLookupFallback2(name),
			locusLookupFallback3(name)
		])
			.then(locus => response.ok(res, locus))
			.catch(aggregateError => {
				if (aggregateError.every(err => err.contains('No Locus found'))) {
					response.notFound(res, `No Locus found for name ${name}`);
				} else {
					response.defaultServerError(res, err);
				}
			});
	}
}

module.exports = {
	getByFullName
};
