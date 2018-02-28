const stream = require('stream');

const START_OF_GROUP = /^(?:[0-9]+,)?[0-9]+([acd])[0-9]+(?:,[0-9]+)?$/;
const ID_MATCHER = /^id: .*\n?$/;

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

    constructor() {
        super();
        this.deletedTerm = '';
        this.ignore = false;
    }

    _transform(chunk, encoding, next) {
        chunk.toString().split('\n').forEach(line => {

			// Switch into ignore mode when we encounter a
			// diff group that isn't 'change' or 'delete'
            let groupStart = line.match(START_OF_GROUP);
            if (groupStart) {
                this.ignore = !(groupStart[1] === 'c' || groupStart[1] === 'd');
            }

			// Skip lines when we're in ignore mode
            if (this.ignore) {
                return;
            }

			// Strip the diff arrow off the start of the line.
			// This is also a data line, so re-add the newline
            if (line.charAt(0) === '<' || line.charAt(0) === '>') {
                line = line.slice(2) + '\n';
            }

			// Start of a deleted term
            if (line.match(ID_MATCHER)) {
                this.deletedTerm += line;
            }
			// End of a deleted term
            else if (this.deletedTerm && (line === '---' || line === '\n')) {
                this.deletedTerm = '[Term]\n' + this.deletedTerm;
                this.push(this.deletedTerm);
                this.deletedTerm = '';
            }
			// Continuation of a deleted term
            else if (this.deletedTerm) {
                this.deletedTerm += line;
            }
        });

        next();
    }

}

module.exports = {
    DeletedOboTermExtractor
};
