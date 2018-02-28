'use strict';

const request = require('request');

const BASE_URL = 'http://www.ebi.ac.uk/ena/data/taxonomy/v1/taxon';

/**
 * Looks up Taxon info (including scientific name) from NCBI using its unique ID.
 *
 * @param id
 * @returns {Promise}
 */
function getTaxonById(id) {
    return new Promise((resolve, reject) => {
        let requestUrl = `${BASE_URL}/tax-id/${id}`;
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

/**
 * Looks up a Taxon info from NCBI using the it's scientific name.
 *
 * Scientific name is a combination of genus and species, ex: Canis lupus
 *
 * @param name
 */
function getTaxonByScientificName(name) {
    return new Promise((resolve, reject) => {
        let requestUrl = `${BASE_URL}/scientific-name/${name}`;
        request.get(requestUrl, (error, response, bodyJson) => {
            if (error) reject(new Error(error));
            else if (response.statusCode === 404) reject(new Error(`No Taxon matches name ${name}`));
            else {
                let body = JSON.parse(bodyJson);
                if (body.length > 1) reject(new Error(`Multiple Taxa found for name ${name}`));
                else {
                    let taxon = body[0];
                    taxon.taxId = Number(taxon.taxId);
                    resolve(taxon);
                }
            }
        });
    });
}

module.exports = {
    getTaxonById,
    getTaxonByScientificName
};