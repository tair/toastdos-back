'use strict';

const util = require('util');

const user           = require('../models/user');
const authentication = require('../lib/authentication');
const response       = require('../lib/responses');

/**
 * Verify password and generate a JWT for a user
 * @param  {Express.Request}   req  - the request
 * @param  {Express.Resonse}   res  - the response
 * @param  {Function} next - pass to next route handler
 */
function login(req, res, next) {
	let userDataPromise = user.where('username', req.body.username.toLowerCase()).fetch({
		require: true,
		withRelated: ['password']
	});

	let checkPasswordPromise = userDataPromise.then(user => {
		return new Promise((accept, reject) => {
			authentication.checkPassword(req.body.password, user.related('password').get(password_hash), (err, success) => {
				if(err) {
					return reject(err);
				}
				return accept(success);
			});
		});
	});

	return Promise.all([userDataPromise, checkPasswordPromise])
	.then(([userData, passMatch]) => {
		if(!passMatch) {
			return response.badRequest(res, 'Password is incorrect for user');
		}
		
		let tokenData = {
			username: userData.get(username),
			// todo add other token data
		};

		return new Promise((accept, reject) => {
			authentication.signToken(tokenData, (err, theToken) => {
				if(err) {
					throw err;
				}

				return response.ok(res, {
					token: theToken
				});
			});
		});
	})
	.catch(err => {
		if(err.message === 'EmptyResponse') {
			return response.badRequest(res, 'Username not found');
		}

		return response.defaultServerError(res, err);
	});
}


module.exports = {
	login
};
