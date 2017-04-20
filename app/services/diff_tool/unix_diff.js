const spawn  = require('child_process').spawn;

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

module.exports = unixDiff;
