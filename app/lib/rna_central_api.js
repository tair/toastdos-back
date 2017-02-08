'use strict';

const request = require('request');

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
		let requestUrl = `${BASE_URL}/${name}`;
		request.get(requestUrl, (error, response, bodyJson) => {
			if (error) {
				reject(new Error(error));
			} else if (response.statusCode === 404) {
				reject(new Error(`No Locus found for name ${name}`));
			} else {
				let body = JSON.parse(bodyJson);
				resolve(body);
			}
		});
	});
}

module.exports = {
	getLocusByName
};
