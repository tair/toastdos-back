'use strict';

/**
 * This is a small command line utility to manually trigger an obo update
 */

const updater = require('./obo_updater');

let oboUrl = process.argv[2];

if (!oboUrl) {
	console.log('Usage: cli.js <obo file uri>');
	process.exit(1);
}

updater.updateKeywordsUsing(oboUrl).then(() => process.exit(0));
