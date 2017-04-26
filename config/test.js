'use strict';
const tsFormat = () => (new Date()).toLocaleTimeString();

module.exports = {
    //test environment configuration
	logger: {
		level: 'none',
		name: 'placeholder',
		filename: './logs/test.log',
	},
	database: require('../knexfile').test,
	testsecret: 'testsecret'
};
