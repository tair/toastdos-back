'use strict';

const bookshelf = require('../lib/bookshelf');

require('./annotation');
require('./submission');

const Publication = bookshelf.model('Publication', {
	tableName: 'publication',
	referencedBy: function() {
		return this.hasMany('Annotation', 'publication_id');
	},
	submissions: function() {
		return this.hasMany('Submission', 'publication_id');
	}
});

module.exports = Publication;
