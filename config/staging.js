'use strict';
const tsFormat = () => (new Date()).toLocaleTimeString();

module.exports = {
	// local staging environment configuration
    logger: {
        level: 'info',
        levels: {
            'debug': 0,
            'info': 1,
            'warn': 2,
            'error': 3
        },
        name: 'staging-log',
        filename: './logs/staging.log',
        json: false,
        timestamp: tsFormat
    },
    database: require('../knexfile').staging,
    jwt: {
        algorithm: 'RS256',
        expiresIn: '504000000', // expire after 140 hours
    },
    resourceRoot: process.env.RESOURCEROOT,
    insensitiveLikeOperator: 'ILIKE'
};
