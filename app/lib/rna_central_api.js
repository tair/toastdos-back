'use strict';

const request = require('request');

const NCBI = require('./ncbi_api');

const BASE_URL = 'http://rnacentral.org/api/v1/rna';

/**
 * Gets an RNA Central gene by it's name.
 * These typically look like URS0000000018 for RNA Central.
 *
 * @param name
 * @returns {Promise}
 */
function getLocusByName(name) {
	return new Promise((resolve, reject) => {
		let requestUrl = `${BASE_URL}/${name}?flat=true`;
		request.get(requestUrl, (error, response, bodyJson) => {
			if (error) reject(new Error(error));
			else if (response.statusCode === 404) reject(new Error(`No Locus found for name ${name}`));
			else {
				let body = JSON.parse(bodyJson);
				let taxonId =  body.xrefs.results[0].taxid;

				NCBI.getTaxonById(taxonId).then(taxonInfo => {
					resolve({
						source: 'RNA Central',
						locus_name: body.rnacentral_id,
						taxon_id: taxonId,
						taxon_name: taxonInfo.scientificName
					});
				});
			}
		});
	});
}

module.exports = {
	getLocusByName
};
