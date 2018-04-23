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
    database: require('../knexfile').development,
    jwt: {
        algorithm: 'RS256',
        expiresIn: '504000000', // expire after 140 hours
    },
    resourceRoot: process.env.RESOURCEROOT,
    insensitiveLikeOperator: 'LIKE'
};
