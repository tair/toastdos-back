'use strict';

const config = require('../../config')

const winston = require('winston');

const tsFormat = () => (new Date()).toLocaleTimeString();

const fs = require('fs');

// Create the log directory if it does not exist
if (!fs.existsSync('./logs')) {
	fs.mkdirSync('./logs');
}

const logger = new winston.Logger({
	transports: [
		new winston.transports.File({
			level: 'info',
			name: 'info-file',
			filename: './logs/file.log',
			timestamp: tsFormat
		}),
		new (winston.transports.File)({
			level: 'debug',
			name: 'error-file',
			filename: './logs/file.log',
			timestamp: tsFormat
		})
	],
	exitOnError: false
});

module.exports = logger;
module.exports.stream = {
	write: function(message, encoding){
		logger.info(message);
	}
};