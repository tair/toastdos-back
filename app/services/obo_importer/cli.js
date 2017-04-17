'use strict';

/**
 * This is a small command line utility to manually trigger an obo update.
 * Target options include:
 *     eco, po, go - download / run update with pre-defined obo resource
 *     filepath    - run import on specified file, if exists
 *     url         - download / run update with obo at URL
 */
const fs       = require('fs');
const updater  = require('./obo_updater');
const importer = require('./obo_importer');

/**
 * First checks if target is a pre-defined obo resource,
 * then checks if target is a file,
 * then finally falls back to treating it like a URL.
 *
 * Returns a Promise that resolves when complete, or rejects on error
 */
function loadTarget(target) {
	if (!target) {
		return Promise.reject('Bad target');
	}
	else if (target === 'eco') {
		return updater.updateKeywordsUsing('https://raw.githubusercontent.com/evidenceontology/evidenceontology/master/eco.obo');
	}
	else if (target === 'po') {
		return updater.updateKeywordsUsing('http://purl.obolibrary.org/obo/po.obo');
	}
	else if (target === 'go') {
		return updater.updateKeywordsUsing('http://www.geneontology.org/ontology/go.obo');
	}
	else if (fs.existsSync(target)) {
		console.log(`Running import on file '${target}'`);
		return importer.loadOboIntoDB(target);
	}
	else {
		return updater.updateKeywordsUsing(target);
	}
}

loadTarget(process.argv[2])
	.then(() => process.exit(0))
	.catch(err => {
		if (err === 'Bad target') console.log('Usage: npm run import <target>');
		else console.error(err);

		process.exit(1);
	});
