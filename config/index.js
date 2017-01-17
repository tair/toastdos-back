"use strict";

// Switch our configuration based on environment
if (process.env.NODE_ENV === 'production') {
	module.exports = require('./production');
}
else if (process.env.NODE_ENV === 'test') {
	module.exports = require('./test');
}
else {
	process.env.NODE_ENV = 'development';
	module.exports = require('./development');
}
