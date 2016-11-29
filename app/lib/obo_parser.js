"use strict";

const stream = require('stream');

const BLOCK_START = /^\[(.+)]$/;
const KEY_VALUE   = /([\w-]+): (.*)/;

const State = Object.freeze({
	HEADER: 'Header',
	IGNORE: 'Ignore',
	PARSING: 'Parsing'
});

class OboParser extends stream.Transform {

	constructor(headerParser) {
		super({
			readableObjectMode : true,
			writableObjectMode: true
		});
		this.headerParser = headerParser;
		this.state = State.HEADER;
		this.currentTerm = {};
	}

	_transform(chunk, encoding, next) {
		let line = chunk.toString();

		chunk.toString().split('\n').forEach(line => {

			switch (this.state) {

				// Parse initial header until we see a new line
				case State.HEADER:
					let headerParts = line.match(KEY_VALUE);
					if (headerParts) {
						this.currentTerm[headerParts[1]] = headerParts[2];
					}
					else {
						// Pass parsed header into the callback
						if (this.headerParser) {
							this.headerParser(JSON.stringify(this.currentTerm));
						}
						this.currentTerm = {};

						// Is this a newline or the start of a block? If there is no header, this is the entry point (sorry, this is filthy, I know.)
						let blockStart = line.match(BLOCK_START);
						if (blockStart) {
							if (blockStart[1] === 'Term') {
								this.state = State.PARSING;
							} else {
								this.state = State.IGNORE;
							}
						}
						else {
							// This was a newline, defer to PARSING block
							this.state = State.PARSING;
						}
					}
					break;


				case State.PARSING:
					let blockStart2 = line.match(BLOCK_START);
					if (blockStart2) {
						// If this block isn't a term, ignore everything until the Next term
						if (blockStart2[1] !== 'Term') {
							this.state = State.IGNORE;
						}
					}
					else if (line.length === 0) {
						// Finish the current term when we see a newline
						this.push(JSON.stringify(this.currentTerm));
						this.currentTerm = {};
					}
					else {
						// Save the current line's key-value to the term
						let parts = line.match(KEY_VALUE);
						let key = parts[1];
						let newValue = parts[2];

						// If the key already exists, add (or convert) to array
						if (this.currentTerm[key]) {
							if (this.currentTerm[key] instanceof Array) {
								this.currentTerm[key].push(newValue);
							} else {
								let curValue = this.currentTerm[key];
								this.currentTerm[key] = [curValue, newValue];
							}
						}
						else {
							this.currentTerm[key] = newValue;
						}
					}
					break;


				case State.IGNORE:
					// Ignore data until we find the next term
					let blockStart3 = line.match(BLOCK_START);
					if (blockStart3 && blockStart3[1] === 'Term') {
						this.state = State.PARSING;
					}
					break;
			}

		});

		next();
	}
}

module.exports.OboParser = OboParser;
