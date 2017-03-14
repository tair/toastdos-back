'use strict';

const request = require('request');
const fs      = require('fs');

const NAME_EXTRACTOR = /.*\/(.*)/;
const DEFAULT_FILE_NAME = 'default_name';

/**
 * Downloads the file at the given uri into the resources directory.
 */
function downloadFile(uri) {
	let filePath = `resources/${uri.match(NAME_EXTRACTOR)[1]}`;
	if (!filePath) filePath = DEFAULT_FILE_NAME;

	let fileStream = fs.createWriteStream(filePath);
	request.get(uri)
		.on('response', res => {
			if (res.statusCode !== 200) {
				fileStream.end(() => {
					fs.unlinkSync(filePath);
					throw new Error(`Error downloading '${uri}': ${res.statusMessage}`);
				});
			}
		})
		.pipe(fileStream);
}
