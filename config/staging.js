'use strict';
const tsFormat = () => (new Date()).toLocaleTimeString();

module.exports = {
	// development environment configuration
	loggerinfo: {
		level: 'info',
		name: 'developer-info',
		filename: './logs/staging.log',
		json: false,
		timestamp: tsFormat
	},
	loggerdebug: {
		level: 'debug',
		name: 'developer-debug',
		filename: './logs/staging.log',
		json: false,
		timestamp: tsFormat
	},
	database: require('../knexfile').staging,
	jwt: {
		algorithm: 'RS256',
		expiresIn: '1800000', // expire after 1 hour
	}
};
