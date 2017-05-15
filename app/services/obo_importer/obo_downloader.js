'use strict';

const request = require('request');
const fs      = require('fs');

const NAME_EXTRACTOR = /.*\/(.*)/;
const DEFAULT_FILE_NAME = 'default_name';

/**
 * Downloads the obo file from the given uri.
 * If the file already exists, the existing file is cached before
 * the new one starts downloading.
 *
 * Returns a promise that resolves to the name of the downloaded file.
 */
function downloadObo(oboRoot, uri) {
	// Make sure obo and cache directories actually exist
	if (!fs.existsSync(oboRoot)) {
		fs.mkdirSync(oboRoot);
	}
	if (!fs.existsSync(`${oboRoot}/cache/`)) {
		fs.mkdirSync(`${oboRoot}/cache/`);
	}

	// Extract obo file name from uri
	let filename = uri.match(NAME_EXTRACTOR)[1];
	if (!filename) {
		filename = DEFAULT_FILE_NAME;
	}

	let filePath = `${oboRoot}/${filename}`;
	let error = null;

	// Cache existing obo file
	if (fs.existsSync(`${oboRoot}/${filename}`)) {
		fs.renameSync(`${oboRoot}/${filename}`, `${oboRoot}/cache/${filename}`);
	}

	// Download new obo file
	let fileStream = fs.createWriteStream(filePath);
	return new Promise((resolve, reject) => {
		request.get(uri)
			.on('response', res => {
				if (res.statusCode !== 200) {
					error = res.statusMessage;
					fileStream.end();
				}
			})
			.pipe(fileStream)
			.on('finish', () => {
				if (error) {
					fs.unlinkSync(filePath);
					reject(new Error(`Error downloading '${uri}': ${error}`));
				} else {
					resolve(filename);
				}
			});
	});
}

module.exports = {
	downloadObo,
};
