#!/usr/bin/env node
'use strict';

if(!process.env.RESOURCEROOT) {
    console.error('No environment variable RESOURCEROOT found.');
    process.exit(1);
}

const DESTINATION_DIR = process.env.RESOURCEROOT;
const FILENAME        = 'orcid_app_info.json';

const fs   = require('fs');
const path = require('path');

let jsonStructure = {
    client_id: 'APP-EXAMPLE',
    client_secret: '12345678-abcdef-clint-secret'
};

fs.writeFileSync(path.join(DESTINATION_DIR, FILENAME), JSON.stringify(jsonStructure, null, 4));

console.log('File created in \''+DESTINATION_DIR+'/orcid_app_info.json\', be sure to replace the values with values from your ORCID account app.');
