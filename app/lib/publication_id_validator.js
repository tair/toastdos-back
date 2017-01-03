"use strict";

const request = require('request');

/**
 * DOI - Digital Object Identifier
 *
 * 10.1594/GFZ.GEOFON.gfz2009kciu
 */
const DOI_VALIDATOR = /^(10\.\d{4,9}\/.+)$/;

/**
 * Pubmed ID
 *
 * 123456789
 */
const PUBMED_VALIDATOR = /^(\d+)$/;


function doiUrl(doi) {
	return `http://doi.org/api/handles/${doi}`;
}

function pubmedUrl(pmid) {
	return `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${pmid}`;
}


function isDOI(val) {
	let text = '' + val;
	return !!text.match(DOI_VALIDATOR);
}

function isPubmedId(val) {
	let text = '' + val;
	return !!text.match(PUBMED_VALIDATOR);
}


/**
 * Searches DOI registry to see if the provided DOI actually
 * belongs to an existing publication
 * @param doi
 */
function validateDOI(doi) {
	return new Promise((resolve, reject) => {
		request.get(doiUrl(doi), (error, response, bodyJson) => {
			let body = JSON.parse(bodyJson);

			// www.doi.org is silly and redefines standard HTTP error codes.
			// See http://www.doi.org/factsheets/DOIProxy.html
			// All you need to know is responseCode '1' means '200 OK'.
			if (body.responseCode === 1) {
				resolve(body);
			} else {
				reject(new Error(`DOI '${doi}' did not match any publications`));
			}
		});
	});
}

/**
 * Searches the National Center for Biotechnology Information (NCBI)
 * to see if the provided Pubmed ID actually belongs
 * to an existing publication
 * @param pmid
 */
function validatePubmedId(pmid) {
	return new Promise((resolve, reject) => {
		request.get(pubmedUrl(pmid), (error, response, bodyJson) => {
			let body = JSON.parse(bodyJson);
			let lookupError = body.result[pmid].error;

			if (lookupError) {
				reject(new Error(`Pubmed ID '${pmid}' did not match any publications`));
			} else {
				resolve(body);
			}
		});
	});
}

module.exports = {
	isDOI,
	isPubmedId,
	validateDOI,
	validatePubmedId
};
