'use strict';

const bookshelf = require('../lib/bookshelf');

require('./annotation');

const Publication = bookshelf.model('Publication', {
	tableName: 'publication',
	referencedBy: function() {
		return this.hasMany('Annotation', 'publication_id');
	}
});

module.exports = Publication;
