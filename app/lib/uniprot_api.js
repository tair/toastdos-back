"use strict";

const request = require('request');

const QUERY_RESULT_LIMIT = 10;

/**
 *
 * @param query
 * @returns {string}
 */
function uniprotUrl(query) {
	return `http://www.uniprot.org/uniprot/?limit=${QUERY_RESULT_LIMIT}&sort=score&format=json&query=${query}`;
}

/**
 * Gets a uniprot gene by ID.
 * Promise resolves with the single matching gene,
 * or rejects with error for several or zero matching genes.
 *
 * @param id
 * @returns {Promise}
 */
function getGeneById(id) {
	let requestUrl = uniprotUrl(`id:${id}`);
	return new Promise((resolve, reject) => {
		request.get(requestUrl, (error, response, bodyJson) => {
			if (error) {
				reject(new Error(error));
			} else if (!bodyJson) {
				reject(new Error('Given ID matches no genes'));
			} else {
				let body = JSON.parse(bodyJson);
				if (body.length > 1) {
					reject(new Error('Given ID matches multiple genes'));
				} else {
					resolve(body[0]);
				}
			}
		});
	});
}

/**
 * Returns a list of uniprot genes for a given query, organizing by best match.
 *
 * @param name
 */
function searchGeneByName(name) {
	let requestUrl = uniprotUrl(name);
	return new Promise((resolve, reject) => {
		request.get(requestUrl, (error, response, bodyJson) => {
			if (error) {
				reject(new Error(error));
			} else if (!bodyJson) {
				reject(new Error('Given query matches no genes'));
			} else {
				let body = JSON.parse(bodyJson);
				resolve(body);
			}
		});
	});
}


module.exports = {
	getGeneById,
	searchGeneByName
};
