'use strict';

module.exports = {
	// development environment configuration
	logger: config.logger,
	database: require('../knexfile').development,
	jwt: {
		algorithm: 'RS256',
		expiresIn: '1800000', // expire after 1 hour
	}
};
