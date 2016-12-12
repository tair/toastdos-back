"use strict";

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


function isDOI(text) {
	return !!DOI_VALIDATOR(text);
}

function isPubmedId(text) {
	return !!PUBMED_VALIDATOR(text);
}


module.exports = {
	isDOI,
	isPubmedId
};
