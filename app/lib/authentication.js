"use strict";

const jwt 		= require('jsonwebtoken');
const config 	= require('../../config');


const JWT_PRIVATE_CERT_FILE 	= "./resources/privkey.pem";
const JWT_PUBLIC_CERT_FILE 		= "./resources/pubkey.pem";

let privateCert = '';
let publicCert = '';

// Use a basic JWT secret while testing
if (process.env.NODE_ENV === 'test') {
	const testConfig = require('../../config/test');
	privateCert = publicCert = testConfig.testsecret;
} else {
	const fs = require('fs');
	privateCert = fs.readFileSync(JWT_PRIVATE_CERT_FILE);
	publicCert = fs.readFileSync(JWT_PUBLIC_CERT_FILE);
}

/**
 * Sign a JWT
 * @param  {Object}   tokenData - the data to use in the token data
 * @param  {Function} callback  - the callback
 */
function signToken(tokenData, callback) {
	return jwt.sign(tokenData, privateCert, config.jwt, callback);
}

/**
 * Verify a JWT
 * @param  {Sring}   	token    - the token to verify
 * @param  {Function} 	callback - the callback
 */
function verifyToken(token, callback) {
	return jwt.verify(token, publicCert, callback);
}


module.exports = {
	signToken,
	verifyToken
};
