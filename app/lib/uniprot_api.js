'use strict';

const request = require('request');

const NCBI = require('./ncbi_api');

// ex: For "Vulpes vulpes (red fox)", capture "Vulpes vulpes"
const TAXON_EXTRACTING_REGEX = /^(\b[\w. ]+\b) *(?:\(.*)?$/;
const QUERY_RESULT_LIMIT = 10;
const BASE_URL = 'http://www.ebi.ac.uk/proteins/api/proteins/';

/**
 * Gets a uniprot locus by name.
 * These can look like A2BC19, P12345, or A0A022YWF9 for Uniprot.
 * Promise resolves with the single matching locus,
 * or rejects with error with no matching locus.
 *
 * @param name
 * @returns {Promise}
 */
function getLocusByName(name) {
	let requestUrl = `${BASE_URL}${name}.json`;
	return new Promise((resolve, reject) => {
		request.get(requestUrl, (error, response, bodyJson) => {
			if (error) {
				reject(new Error(error));
			} else if (response.statusCode != 200) {
				reject(new Error(`No Locus found for name ${name}`));
			} else {
				let body = JSON.parse(bodyJson);
				let taxonName = body.organism.names[0].value;

				NCBI.getTaxonByScientificName(taxonName).then(taxonInfo => {
					resolve({
						source: 'Uniprot',
						locus_name: body.accession,
						taxon_name: taxonName,
						taxon_id: taxonInfo.taxId
					});
				});
			}
		});
	});
}

module.exports = {
	getLocusByName
};
