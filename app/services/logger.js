'use strict';

const config = require('../../config');
const winston = require('winston');
const fs = require('fs');



// Create the log directory if it does not exist
if (!fs.existsSync('./logs')) {
	fs.mkdirSync('./logs');
}

let logmode;
if (process.env.NODE_ENV === 'test') {
	logmode = new winston.transports.Console(config.logger);
} else {
	logmode = new winston.transports.File(config.logger);
}

const logger = new winston.Logger({
	transports: [
		logmode
	],
	exitOnError: false
});

module.exports = logger;
module.exports.stream = {
	write: function(message, encoding) {
		logger.info(message);
	}
};
