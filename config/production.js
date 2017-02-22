'use strict';

module.exports = {
	// production environment configuration
	database: require('../knexfile').production,
	jwt: {
		algorithm: 'RS256',
		expiresIn: '9000000', // expire after 5 hours
	}
};
