'use strict';

/**
 * Wrapper for requests to TAIR webservices
 */

const request = require('request');

const BASE_URL = 'https://www.arabidopsis.org';

/**
 * Gets a TAIR gene by it's name.
 * These typically look like AT1G10000 for TAIR.
 *
 * @param name
 * @returns {Promise}
 */
function getLocusByName(name) {
	let requestUrl = `${BASE_URL}/loci/${name}`;
	return new Promise((resolve, reject) => {
		request.get(requestUrl, (error, response, bodyJson) => {
			if (error) {
				reject(new Error(error));
			} else if (response.statusCode === 404) {
				reject(new Error(`No Locus found for name ${name}`));
			} else {
				resolve(JSON.parse(bodyJson));
			}
		});
	});
}

/**
 * Gets array of all Arabidopsis symbols and the loci to which
 * they map (symbolName, fullName, locusName).
 *
 * CAUTION: This request can take several seconds to complete.
 */
function getAllSymbols() {
	let requestUrl = `${BASE_URL}/symbols`;
	return new Promise((resolve, reject) => {
		request.get(requestUrl, (error, response, bodyJson) => {
			if (error) {
				reject(new Error(error));
			} else {
				resolve(JSON.parse(bodyJson));
			}
		});
	});
}

/**
 * Gets array of symbols matching the given symbol name.
 */
function getSymbolsByName(symbol) {
	let requestUrl = `${BASE_URL}/symbols/${symbol}`;
	return new Promise((resolve, reject) => {
		request.get(requestUrl, (error, response, bodyJson) => {
			if (error) {
				reject(new Error(error));
			} else {
				let body = JSON.parse(bodyJson);
				if (body.length === 0) {
					reject(new Error(`No Loci for symbol ${symbol}`));
				} else {
					resolve(body);
				}
			}
		});
	});
}

module.exports = {
	getLocusByName,
	getAllSymbols,
	getSymbolsByName
};
