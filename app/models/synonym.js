'use strict';

const bookshelf = require('../lib/bookshelf');

require('./keyword');

const Synonym = bookshelf.model('Synonym', {
	tableName: 'synonym',
	keyword: function() {
		return this.belongsTo('Keyword', 'keyword_id');
	}
});

module.exports = Synonym;

