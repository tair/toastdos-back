'use strict';

if(!process.env.RESOURCEROOT) {
	console.error('No environment variable RESOURCEROOT found.');
	process.exit(1);
}

// Switch our configuration based on environment
if (process.env.NODE_ENV === 'production') {
	module.exports = require('./production');
}
else if (process.env.NODE_ENV === 'test') {
	module.exports = require('./test');
}
else if (process.env.NODE_ENV === 'staging') {
	module.exports = require('./staging');
}
else {
	process.env.NODE_ENV = 'development';
	module.exports = require('./development');
}
