"use strict";

const chai   = require('chai');
const stream = require('stream');

const OboParser = require('../app/lib/obo_parser').OboParser;

/**
 * Allows us to easily pipe test strings through our obo parser
 */
class TestString extends stream.Readable {
	constructor(string) {
		super();
		this.string = string;
	}

	_read(n) {
		this.push(this.string);
		this.push(null);
	}
}

describe('OBO Parser', function() {

	it('Parses header separately', function(done) {
		const obo = '' +
			'something: abcd\n' +
			'another: 12345 I am a header field\n' +
			'\n' +
			'[Term]\n' +
			'id: GO:001\n';

		const expected = {
			something: 'abcd',
			another: '12345 I am a header field'
		};

		function testParser(header) {
			chai.expect(header).to.deep.equal(expected);
			done();
		}

		new TestString(obo)
			.pipe(new OboParser(testParser));
	});

	it('Parses a basic term', function(done) {
		const obo = '' +
			'[Term]\n' +
			'id: GO:0000003\n' +
			'name: test keyword 3\n' +
			'namespace: overide_keyword_type\n';

		const expected = {
			id: 'GO:0000003',
			name: 'test keyword 3',
			namespace: 'overide_keyword_type'
		};

		new TestString(obo)
			.pipe(new OboParser())
			.on('end', () => done())
			.on('data', data => chai.expect(data).to.deep.equal(expected));
	});

	it('Multiple values for a field are parsed into an array', function(done) {
		const obo = '' +
			'[Term]\n' +
			'id: GO:0000002\n' +
			'name: test keyword 2\n' +
			'synonym: "Some random synonym" EXACT []\n' +
			'thing: some thing to split up the synonym fields\n' +
			'synonym: "Another random synonym"\n' +
			'synonym: "A third synonym"\n';

		const expected = {
			id: 'GO:0000002',
			name: 'test keyword 2',
			thing: 'some thing to split up the synonym fields',
			synonym: [
				'"Some random synonym" EXACT []',
				'"Another random synonym"',
				'"A third synonym"'
			]
		};

		new TestString(obo)
			.pipe(new OboParser())
			.on('end', () => done())
			.on('data', data => chai.expect(data).to.deep.equal(expected));
	});

	it('Non-Term values are ignored entirely', function(done) {
		const obo = '' +
			'[NotATerm]\n' +
			'thing: ignore me\n' +
			'\n' +
			'[Term]\n' +
			'id: GO:0000002\n' +
			'name: test keyword 2\n';

		const expected = {
			id: 'GO:0000002',
			name: 'test keyword 2'
		};

		new TestString(obo)
			.pipe(new OboParser())
			.on('end', () => done())
			.on('data', data => chai.expect(data).to.deep.equal(expected));
	});

});
