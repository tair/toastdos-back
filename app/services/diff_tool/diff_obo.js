const stream = require('stream');

const START_OF_GROUP = /^(?:[0-9]+,)?[0-9]+([acd])[0-9]+(?:,[0-9]+)?$/;
const ID_MATCHER = /^ID: .*$/;

/**
 * Processes unix diffs of obo files to find terms that
 * have been deleted entirely.
 *
 * A block that starts with "ID: GO:123456789" and ends with
 * a newline is considered a deleted term.
 *
 * Outputs deleted obo terms as strings in individual chunks.
 */
class DeletedOboTermExtractor extends stream.Transform {

	_transform(chunk, encoding, next) {
		let lines = chunk.toString().split('\n');

		let deletedTerm = '';
		let ignore = false;

		lines.forEach(line => {

			// Switch into ignore mode when we encounter a
			// diff group that isn't 'change' or 'delete'
			let groupStart = line.match(START_OF_GROUP);
			if (groupStart) {
				ignore = !(groupStart[1] === 'c' || groupStart[1] === 'd');
			}

			// Skip lines when we're in ignore mode
			if (ignore) {
				return;
			}

			// Start of a deleted term
			if (line.match(ID_MATCHER)) {
				deletedTerm += line;
			}
			// End of a deleted term
			else if (line === '\n') {
				this.push(deletedTerm);
				deletedTerm = '';
			}
			// Continuation of a deleted term
			else {
				deletedTerm += line;
			}
		});

		next();
	}

}

module.exports = {
	DeletedOboTermExtractor
};
