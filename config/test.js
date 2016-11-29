"use strict";

module.exports = {
	// development environment configuration
	database: require('../knexfile').test,
	jwt: {
		algorithm: "RS256",
		expiresIn: "1800000", 		// expire after 1 minute
		
	}
};
