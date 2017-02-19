'use strict';

const request = require('request');

const NCBI = require('./ncbi_api');

// ex: For "Vulpes vulpes (red fox)", capture "Vulpes vulpes"
const TAXON_EXTRACTING_REGEX = /^(\b[\w ]+\b) *(?:\(.*)?$/;
const QUERY_RESULT_LIMIT = 10;
const BASE_URL = 'http://www.uniprot.org/uniprot/?format=json';

/**
 * Gets a uniprot gene by name.
 * These can look like A2BC19, P12345, or A0A022YWF9 for Uniprot.
 * Promise resolves with the single matching gene,
 * or rejects with error for several or zero matching genes.
 *
 * @param name
 * @returns {Promise}
 */
function getLocusByName(name) {
	let requestUrl = `${BASE_URL}&limit=2&query=accession:${name}`;
	return new Promise((resolve, reject) => {
		request.get(requestUrl, (error, response, bodyJson) => {
			if (error) {
				reject(new Error(error));
			} else if (!bodyJson) {
				reject(new Error(`No Locus found for name ${name}`));
			} else {
				let body = JSON.parse(bodyJson);
				if (body.length > 1) {
					reject(new Error('Given ID matches multiple loci'));
				} else {
					let taxonName = body[0].organism.match(TAXON_EXTRACTING_REGEX)[1];

					NCBI.getTaxonByScientificName(taxonName).then(taxonInfo => {
						resolve({
							source: 'Uniprot',
							locus_name: body[0].id,
							taxon_name: taxonName,
							taxon_id: taxonInfo.taxId
						});
					});
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
	let requestUrl = `${BASE_URL}&limit=${QUERY_RESULT_LIMIT}&query=${name}`;
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
	getLocusByName,
	searchGeneByName
};
