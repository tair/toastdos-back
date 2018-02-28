'use strict';

const ecoMapHelper   = require('./eco_mapping_downloader');
const ecoMapImporter = require('./eco_mapping_importer');
const path = require('path');
const config = require('../../../config');

const ECOMAP_ROOT = path.join(config.resourceRoot, 'ecomap');

/**
 * Updates our database with new keyword mappings.
 */
function updateKeywordMappingsUsing(ecoMapURI) {
    console.log(`Downloading from ${ecoMapURI}`);
    return ecoMapHelper.downloadEcoMapping(ECOMAP_ROOT, ecoMapURI).then((ecoMapName) => {
        console.log(`Downloaded ${ecoMapName}`);
        return ecoMapImporter.loadEcoMappingIntoDB(path.join(ECOMAP_ROOT, ecoMapName))
			.then(() => console.log(`Finished importing ${ecoMapName}`));
    });
}

module.exports = {
    updateKeywordMappingsUsing
};
