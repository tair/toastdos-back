'use strict';

const request = require('request');
const fs      = require('fs');

const NAME_EXTRACTOR = /.*\/(.*)/;
const DEFAULT_FILE_NAME = 'default_name';

/**
 * Downloads the eco mapping text file from the given uri.
 *
 * Returns a promise that resolves to the name of the downloaded file.
 */
function downloadEcoMapping(ecoMapRoot, uri) {
	// Make sure directories actually exist
	if (!fs.existsSync(ecoMapRoot)) {
		fs.mkdirSync(ecoMapRoot);
	}

	// Extract file name from uri
	let filename = uri.match(NAME_EXTRACTOR)[1];
	if (!filename) {
		filename = DEFAULT_FILE_NAME;
	}

	let filePath = `${ecoMapRoot}/${filename}`;
	let error = null;

	// Cache existing file
	if (fs.existsSync(`${ecoMapRoot}/${filename}`)) {
		fs.renameSync(`${ecoMapRoot}/${filename}`, `${ecoMapRoot}/${filename}.old`);
	}

	// Download new file
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
	downloadEcoMapping
};
