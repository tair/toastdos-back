'use strict';

const bookshelf = require('../lib/bookshelf');

require('./keyword');

const KeywordType = bookshelf.model('KeywordType', {
	tableName: 'keyword_type',
	keywords: function() {
		return this.hasMany('Keyword', 'keyword_type_id');
	}
});

module.exports = KeywordType;
