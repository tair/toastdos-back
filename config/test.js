"use strict";

module.exports = {
	// development environment configuration
	database: require('../knexfile').test,
	testsecret: 'testsecret'
};
