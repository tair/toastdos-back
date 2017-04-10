'use strict';
const tsFormat = () => (new Date()).toLocaleTimeString();

module.exports = {
	// production environment configuration
	loggerinfo: {
		level: 'info',
		name: 'production-info',
		filename: './logs/production.log',
		json: false,
		timestamp: tsFormat
	},
	loggerdebug: {
		level: 'debug',
		name: 'production-debug',
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
