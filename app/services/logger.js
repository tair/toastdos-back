'use strict';

const config = require('../../config');
const winston = require('winston');
const fs = require('fs');



// Create the log directory if it does not exist
if (!fs.existsSync('./logs')) {
	fs.mkdirSync('./logs');
}

const logger = new winston.Logger({
	transports: [
		new winston.transports.File(config.loggerinfo),
		new winston.transports.File(config.loggerdebug)
	],
	exitOnError: false
});

module.exports = logger;
module.exports.stream = {
	write: function(message, encoding){
		logger.info(message);
	}
};