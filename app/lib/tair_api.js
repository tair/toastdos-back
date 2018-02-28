'use strict';

/**
 * Wrapper for requests to TAIR webservices
 */

const request = require('request');

const NCBI = require('./ncbi_api');

const BASE_URL = 'https://www.arabidopsis.org';

const DEFAULT_TAXON = {
    taxon_name: 'Arabidopsis thaliana',
    taxon_id: 3702
};

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
            if (error) reject(new Error(error));
            else if (response.statusCode === 404) reject(new Error(`No Locus found for name ${name}`));
            else {
                let body = null;
                try {
                    body = JSON.parse(bodyJson);
                } catch (e) {
                    console.error(e);
                }

                if (!body) {
                    return reject(new Error(`No Locus found for name ${name}`));
                }

                let partialTaxon = {
                    source: 'TAIR',
                    locus_name: body.locusName
                };

				/* Most of the time TAIR will be giving us 'Arabidopsis thaliana' as a
				 * taxon name, so we can save a request to NCBI by hard-coding the response.
				 */
                if (body.taxon === DEFAULT_TAXON.taxon_name) {
                    resolve(Object.assign(partialTaxon, DEFAULT_TAXON));
                }
                else {
					// For other taxa we need to get the maching ID from NCBI
                    NCBI.getTaxonByScientificName(body.taxon).then(taxonInfo => {
                        resolve(Object.assign(partialTaxon, {
                            taxon_name: body.taxon,
                            taxon_id: taxonInfo.taxId
                        }));
                    });
                }
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
