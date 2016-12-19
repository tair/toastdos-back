"use strict";

const bookshelf = require('../lib/bookshelf');

require('./keyword');
require('./annotation');

let GeneTermAnnotation = bookshelf.model('GeneTermAnnotation', {
	tableName: 'gene_term_annotation',
	method: function() {
		return this.hasOne('Keyword', 'method_id');
	},
	keyword: function() {
		return this.hasOne('Keyword', 'keyword_id');
	},
	parentData: function() {
		return this.morphOne('Annotation', 'annotation_id');
	}
});


module.exports = GeneTermAnnotation;
