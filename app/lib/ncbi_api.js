'use strict';

const request = require('request');

const BASE_URL = 'http://www.ebi.ac.uk/ena/data/taxonomy/v1/taxon/tax-id';

/**
 * Looks up a Taxon scientific name from NCBI using the taxon_id.
 *
 * @param id
 * @returns {Promise}
 */
function getTaxonInfo(id) {
	return new Promise((resolve, reject) => {
		let requestUrl = `${BASE_URL}/${id}`;
		request.get(requestUrl, (error, response, bodyJson) => {
			if (error) reject(new Error(error));
			else if (response.statusCode === 404) reject(new Error(`No Taxon matches id ${id}`));
			else {
				let body = JSON.parse(bodyJson);
				body.taxId = Number(body.taxId);
				resolve(body);
			}
		});
	});
}

module.exports = {
	getTaxonInfo
};
