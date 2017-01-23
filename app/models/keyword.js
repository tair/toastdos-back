'use strict';

const bookshelf = require('../lib/bookshelf');

require('./keyword_type');

let Keyword = bookshelf.model('Keyword', {
	tableName: 'keyword',
	keywordType: function() {
		return this.belongsTo('KeywordType', 'keyword_type_id');
	},
	synonyms: function() {
		return this.hasMany('Synonym', 'keyword_id');
	}
});

module.exports = Keyword;
