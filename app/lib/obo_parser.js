"use strict";

const stream = require('stream');

const BLOCK_START = /^\[(.+)]$/;
const KEY_VALUE   = /(\w+): (.*)/;

class OboParser extends stream.Transform {

	constructor(headerParser) {
		super({
			readableObjectMode : true,
			writableObjectMode: true
		});
		this.headerParser = headerParser;
		this.isTerm = true;
		this.currentTerm = {};
	}

	_transform(chunk, encoding, done) {
		chunk.toString().split('\n').forEach(line => {

			let blockStart = line.match(BLOCK_START);

			if (blockStart) {
				this.currentTerm = {};
				this.isTerm = (blockStart[1] === 'Term');
			}
			else if (line.length === 0) {
				this.push(this.currentTerm);
			}
			else {
				let parts = line.match(KEY_VALUE);
				let key = parts[1];
				let val = parts[2];
				this.currentTerm[key] = val;
			}
		});

		done();
	}
}


module.exports.OboParser = OboParser;
