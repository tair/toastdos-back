'use strict';

const fs      = require('fs');
const md5file = require('md5-file');

const oboHelper   = require('./obo_downloader');
const oboImporter = require('./gene_ontology_importer');

const OBO_ROOT = 'resources/obo';

/**
 * Updates our database with new keywords from obo files.
 *
 * Downloads the .obo file from the given URI, checks it against
 * the cached version (if there is one) to look for differences.
 * If there are any, the difference between the files is calculated
 * and the database is updated to reflect this difference.
 *
 * We assume that the same import routine was run on the cached file,
 * so the cached obo file represents the current state of our database.
 */
function updateKeywordsUsing(oboURI) {
	console.log(`Downloading from ${oboURI}`);
	return oboHelper.downloadObo(OBO_ROOT, oboURI).then((oboName) => {

		console.log(`Downloaded ${oboName}`);

		if (fs.existsSync(`${OBO_ROOT}/cache/${oboName}`)) {
			console.log('Checking for differences with cached version...');
			if (md5file.sync(`${OBO_ROOT}/${oboName}`) !== md5file.sync(`${OBO_ROOT}/cache/${oboName}`)) {

				console.log('File has changed, importing updates...');
				return oboImporter.loadOboIntoDB(`${OBO_ROOT}/${oboName}`)
					.then(() => console.log(`Finished importing ${oboName}`));
			}
			else {
				console.log('No difference found. Stopping.');
			}
		}
		else {
			console.log('No cached version found. Running initial import...');
			return oboImporter.loadOboIntoDB(`${OBO_ROOT}/${oboName}`)
				.then(() => console.log(`Finished importing ${oboName}`));
		}
	});
}

module.exports = {
	updateKeywordsUsing
};
