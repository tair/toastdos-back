'use strict';

const request = require('request');
const fs      = require('fs');

const NAME_EXTRACTOR = /.*\/(.*)/;
const DEFAULT_FILE_NAME = 'default_name';
const OBO_ROOT = 'resources/obo';

/**
 * Downloads the obo file from the given uri
 */
function downloadObo(uri) {
	let filename = filenameFrom(uri);
	if (!filename) filename = DEFAULT_FILE_NAME;

	let filePath = `${OBO_ROOT}/${filename}`;
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
	fs.renameSync(`${OBO_ROOT}/${filename}`, `${OBO_ROOT}/cache/${filename}`);
}

/**
 * Restores the given obo file from the obo cache
 */
function uncacheObo(filename) {
	fs.renameSync(`${OBO_ROOT}/cache/${filename}`, `${OBO_ROOT}/${filename}`);
}

/**
 * Extracts the name of the file located at the given uri
 */
function filenameFrom(uri) {
	return uri.match(NAME_EXTRACTOR)[1];
}

module.exports = {
	downloadObo,
	cacheObo,
	uncacheObo,
	filenameFrom
};
