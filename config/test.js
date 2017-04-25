'use strict';
const tsFormat = () => (new Date()).toLocaleTimeString();

module.exports = {
	// development environment configuration
	//level set to error so logger won't log information
	loggerinfo: {
		level: 'error',
		name: 'test-info',
		filename: './logs/test.log'
	},
	loggererror: {
		level: 'error',
		name: 'test-error',
		filename: './logs/test.log'
	},
	database: require('../knexfile').test,
	testsecret: 'testsecret'
};
