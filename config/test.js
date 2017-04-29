'use strict';
const tsFormat = () => (new Date()).toLocaleTimeString();

module.exports = {
    //test environment configuration
	logger: {
		colorize: true,
		level: 'debug',
		levels: {
			'debug': 0,
			'info': 1,
			'warn': 2,
			'error': 3
		},
		timestamp: tsFormat
	},
	database: require('../knexfile').test,
	testsecret: 'testsecret'
};
