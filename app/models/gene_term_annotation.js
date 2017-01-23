'use strict';

const bookshelf = require('../lib/bookshelf');

require('./keyword');
require('./annotation');

const GeneTermAnnotation = bookshelf.model('GeneTermAnnotation', {
	tableName: 'gene_term_annotation',
	method: function() {
		return this.belongsTo('Keyword', 'method_id');
	},
	keyword: function() {
		return this.belongsTo('Keyword', 'keyword_id');
	},
	parentData: function() {
		return this.morphOne('Annotation', 'annotation');
	}
});


module.exports = GeneTermAnnotation;
