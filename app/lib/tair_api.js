'use strict';

/**
 * Wrapper for requests to TAIR webservices
 *
 * The TAIR website was overhauled in 2024 and the old REST API at
 * /loci/{name} no longer returns JSON. The new TAIR3 backend exposes
 * locus lookups via /api/detail/locus/name?0={name}, which returns
 * the locus_id if found or null otherwise.
 */

const request = require('request');

const NCBI = require('./ncbi_api');

const BASE_URL = 'https://www.arabidopsis.org/api';

const DEFAULT_TAXON = {
    taxon_name: 'Arabidopsis thaliana',
    taxon_id: 3702
};

/**
 * Gets a TAIR gene by it's name.
 * These typically look like AT1G10000 for TAIR.
 *
 * Calls the TAIR3 detail API to verify the locus exists in the
 * database. Since all AGI locus IDs are Arabidopsis thaliana,
 * we use the default taxon when a locus is found.
 *
 * @param name
 * @returns {Promise}
 */
function getLocusByName(name) {
    let requestUrl = `${BASE_URL}/detail/locus/name?0=${encodeURIComponent(name)}`;
    return new Promise((resolve, reject) => {
        request.get({url: requestUrl, json: true}, (error, response, body) => {
            if (error) reject(new Error(error));
            else if (response.statusCode >= 400) reject(new Error(`No Locus found for name ${name}`));
            else if (body === null || body === undefined) {
                reject(new Error(`No Locus found for name ${name}`));
            } else {
                resolve({
                    source: 'TAIR',
                    locus_name: name,
                    taxon_name: DEFAULT_TAXON.taxon_name,
                    taxon_id: DEFAULT_TAXON.taxon_id
                });
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
                let body = null;
                let isError = false;
                try {
                    body = JSON.parse(bodyJson);
                } catch (e) {
                    isError = true;
                }
                if (isError || !body || body.length === 0) {
                    reject(new Error("Unable to get all symbols."));
                } else {
                    resolve(body);
                }
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
                let body = null;
                let isError = false;
                try {
                    body = JSON.parse(bodyJson);
                } catch (e) {
                    isError = true;
                }
                if (isError || !body || body.length === 0) {
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