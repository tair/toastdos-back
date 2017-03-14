'use strict';

const fs      = require('fs');
const md5file = require('md5-file');

const oboHelper   = require('./obo_downloader');
const oboImporter = require('./gene_ontology_importer');

const OBO_ROOT = 'resources/obo';

function updateKeywordsUsing(oboURI) {
	console.log(`Downloading from ${oboURI}`);
	oboHelper.downloadObo(OBO_ROOT, oboURI).then((oboName) => {

		console.log(`Downloaded ${oboName}`);

		if (fs.existsSync(`${OBO_ROOT}/cache/${oboName}`)) {
			console.log('Checking for differences with cached version...');
			if (md5file.sync(`${OBO_ROOT}/${oboName}`) !== md5file.sync(`${OBO_ROOT}/cache/${oboName}`)) {

				console.log('File has changed, importing updates...');
				oboImporter.loadOboIntoDB(`${OBO_ROOT}/${oboName}`)
					.then(() => console.log(`Finished importing ${oboName}`));
			}
			else {
				console.log('No difference found. Stopping.');
			}
		}
		else {
			console.log('No cached version found. Running initial import...');
			oboImporter.loadOboIntoDB(`${OBO_ROOT}/${oboName}`)
				.then(() => console.log(`Finished importing ${oboName}`));
		}
	});
}
