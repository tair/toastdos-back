'use strict';

const bookshelf = require('../lib/bookshelf');

require('./keyword');

const KeywordType = bookshelf.model('KeywordType', {
	tableName: 'keyword_type',
	keywords: function() {
		return this.hasMany('Keyword', 'keyword_type_id');
	}
}, {
	getByName: function(name, transaction) {
		return bookshelf.model('KeywordType')
			.where('name', name)
			.fetch({transacting: transaction});
	}
});

module.exports = KeywordType;
