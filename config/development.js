'use strict';
const tsFormat = () => (new Date()).toLocaleTimeString();

module.exports = {
	// development environment configuration
	loggerinfo: {
		level: 'info',
		name: 'developer-info',
		filename: './logs/development.log',
		json: true,
		timestamp: tsFormat
	},
	loggerdebug: {
		level: 'debug',
		name: 'developer-debug',
		filename: './logs/development.log',
		json: true,
		timestamp: tsFormat
	},
	database: require('../knexfile').development,
	jwt: {
		algorithm: 'RS256',
		expiresIn: '1800000', // expire after 1 hour
	}
};
