const spawn  = require('child_process').spawn;
const stream = require('stream');

const START_OF_GROUP = /^(?:[0-9]+,)?[0-9]+[acd][0-9]+(?:,[0-9]+)?$/;

/**
 * Splits chunks of diff output into individual diff groups.
 * Groups start with the line that shows the line numbers
 * for a section of the diff.
 */
class DiffChunker extends stream.Transform {

    _transform(chunk, encoding, next) {
        let curGroup;

        chunk.toString().split('\n').forEach(line => {
            if (line.match(START_OF_GROUP)) {
                if (curGroup) {
                    this.push(curGroup);
                }
                curGroup = '';
            }
            curGroup += line + '\n';
        });
    }

}

/**
 * A wrapper for the unix diff utility.
 *
 * Returns a Read stream
 * Errors are emitted on that stream
 */
function unixDiff(file1, file2) {
    let diff = spawn('diff', [file1, file2]);

	// Emit error output as an error event on the returned stdout stream
    diff.stderr.on('data', err => {
        diff.stdout.emit('error', err.toString('utf8'));
    });

    return diff.stdout;
}

/**
 * Further process the unix diff output so that each chunk
 * from the stream contains a single diff group.
 */
function chunkedUnixDiff(file1, file2) {
    let chunker = new DiffChunker();
    let diff = unixDiff(file1, file2);

	// Forward errors so the consumer can deal with them
    diff.on('error', err => {
        chunker.emit('error', err);
    });

    diff.pipe(chunker);
    return chunker;
}

module.exports = {
    unixDiff,
    chunkedUnixDiff
};
