#!/usr/bin/env node
'use strict';

if (!process.env.RESOURCEROOT) {
    console.error('No environment variable RESOURCEROOT found.');
    process.exit(1);
}

const DESTINATION_DIR = process.env.RESOURCEROOT;
const FILENAME = 'aws_ses_config.json';

const fs = require('fs');
const path = require('path');

let jsonStructure = {
    accessKeyId: 'YOURACCESSKEY',
    secretAccessKey: 'YOURSECRETKEY',
    region: 'us-west-2'
};

fs.writeFileSync(path.join(DESTINATION_DIR, FILENAME), JSON.stringify(jsonStructure, null, 4));

console.log('File created in \'' + DESTINATION_DIR + '/aws_ses_config.json\', be sure to replace the values with values from your AWS account.');