'use strict';

module.exports = {
	// production environment configuration
	database: require('../knexfile').development, // FIXME change to production when we get postgress going in prod
	jwt: {
		algorithm: 'RS256',
		expiresIn: '9000000', // expire after 5 hours
	}
};
