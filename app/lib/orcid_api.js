'use strict';

const request = require('request');
const path = require('path');
const orcidInfo = require(
    path.join(path.resolve(process.env.RESOURCEROOT),
    'orcid_app_info.json')
);

const ORCID_BASE_URL = 'https://orcid.org';
const ORCID_API_URL = 'https://pub.orcid.org';

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

/**
 * Get user's email information from orcid api( documentatoin: https://members.orcid.org/api)
 * @param access_token
 * @param orcid_id
 * @returns {Promise}
 */
function getUserEmail(access_token,orcid_id) {
    return new Promise((resolve, reject) => {
        request.get({
            url: `${ORCID_API_URL}/v3.0/${orcid_id}/email`,
            headers: {
                Authorization: `Bearer ${access_token}`,
                Accept: 'application/json'
            }
        },
            (error, response, body) => {
                error ? reject(error) : resolve(JSON.parse(body));
            });
    });
}

module.exports = {
    getUserToken,
    getUserEmail
};