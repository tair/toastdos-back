'use strict';

const oboHelper   = require('./obo_downloader');
const oboImporter = require('./gene_ontology_importer');

const OBO_ROOT = 'resources/obo';

function updateKeywordsUsing(oboURI) {
	console.log(`Updating from ${oboURI}`);
	oboHelper.downloadObo(OBO_ROOT, oboURI).then((oboName) => {

		console.log(`Downloaded ${oboName}, starting update...`);
		oboImporter.loadOboIntoDB(`${OBO_ROOT}/${oboName}`)
			.then(() => console.log(`Finished importing ${oboName}`));
	});
}
