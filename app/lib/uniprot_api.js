'use strict';

const request = require('request');

const NCBI = require('./ncbi_api');

const BASE_URL = 'https://www.ebi.ac.uk/proteins/api/proteins/';

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
    let notFoundErrorMessage = `No Locus found for name ${name}`;
    let requestUrl = `${BASE_URL}${name}.json`;
    return new Promise((resolve, reject) => {
        request.get(requestUrl, (error, response, bodyJson) => {
            if (error) {
                reject(new Error(error));
            } else if (response.statusCode >= 400) {
                reject(new Error(notFoundErrorMessage));
            } else {
                let body = JSON.parse(bodyJson);
                let taxonName = null;
                let names = body && body.organism && body.organism.names ? body.organism.names : null;

                if (names != null) {
                    for (let item of names) {
                        if (item.type && item.type == 'scientific') {
                            taxonName = item.value;
                        }
                    }
                }

                if (taxonName == null) {
                    reject(new Error(notFoundErrorMessage));
                } else {
                    NCBI.getTaxonByScientificName(taxonName).then(taxonInfo => {
                        resolve({
                            source: 'Uniprot',
                            locus_name: body.accession,
                            taxon_name: taxonName,
                            taxon_id: taxonInfo.taxId
                        });
                    });
                }
            }
        });
    });
}

module.exports = {
    getLocusByName
};
