'use strict';
const tsFormat = () => (new Date()).toLocaleTimeString();

module.exports = {
	// production environment configuration
	logger: {
		level: 'info',
		levels: {
			'debug': 0,
			'info': 1,
			'warn': 2,
			'error': 3
		},
		name: 'production-log',
		filename: './logs/production.log',
		json: false,
		timestamp: tsFormat
	},
	database: require('../knexfile').production,
	jwt: {
		algorithm: 'RS256',
		expiresIn: '9000000', // expire after 5 hours
	}
};
