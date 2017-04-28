'use strict';
const tsFormat = () => (new Date()).toLocaleTimeString();

module.exports = {
	// development environment configuration
	logger: {
		level: 'debug',
		levels: {
			'debug': 0,
			'info': 1,
			'warn': 2,
			'error': 3
		},
		name: 'developement-log',
		filename: './logs/development.log',
		json: false,
		timestamp: tsFormat
	},
	loggerconsole: {
		level: 'none',
		name: 'placeholder'
	},
	database: require('../knexfile').development,
	jwt: {
		algorithm: 'RS256',
		expiresIn: '1800000', // expire after 1 hour
	}
};
