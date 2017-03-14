'use strict';

const request = require('request');
const fs      = require('fs');

const NAME_EXTRACTOR = /.*\/(.*)/;
const DEFAULT_FILE_NAME = 'default_name';

/**
 * Downloads the obo file from the given uri
 */
function downloadObo(uri) {
	let filePath = `resources/obo/${uri.match(NAME_EXTRACTOR)[1]}`;
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

/**
 * Moves the given obo file into the obo cache
 */
function cacheObo(filename) {
	fs.renameSync(`resources/obo/${filename}`, `resources/obo/cache/${filename}`);
}

/**
 * Restores the given obo file from the obo cache
 */
function uncacheObo(filename) {
	fs.renameSync(`resources/obo/cache/${filename}`, `resources/obo/${filename}`);
}
