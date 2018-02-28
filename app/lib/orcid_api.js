'use strict';

const request = require('request');
const path = require('path');
const config = require('../../config');
const orcidInfo = require(path.join(config.resourceRoot, 'orcid_app_info.json'));

const ORCID_BASE_URL = 'https://orcid.org';

/**
 * Completes the backend portion of the ORCID user login
 * OAuth process using a code returned from ORCID.
 * @param authCode
 * @returns {Promise}
 */
function getUserToken(authCode) {
    return new Promise((resolve, reject) => {
        request.post({
            url: `${ORCID_BASE_URL}/oauth/token`,
            form: {
                client_id: orcidInfo.client_id,
                client_secret: orcidInfo.client_secret,
                grant_type: 'authorization_code',
                code: authCode
            }
        },
            (error, response, body) => {
                error ? reject(error) : resolve(JSON.parse(body));
            });
    });
}

module.exports = {
    getUserToken
};