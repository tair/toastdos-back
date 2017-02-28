'use strict';

const bookshelf = require('../lib/bookshelf');

require('./keyword');
require('./annotation');
require('./locus');

const GeneTermAnnotation = bookshelf.model('GeneTermAnnotation', {
	tableName: 'gene_term_annotation',
	method: function() {
		return this.belongsTo('Keyword', 'method_id');
	},
	keyword: function() {
		return this.belongsTo('Keyword', 'keyword_id');
	},
	evidence: function() {
		return this.belongsTo('Locus', 'evidence_id');
	},
	parentData: function() {
		return this.morphOne('Annotation', 'annotation', ['annotation_format', 'annotation_id']);
	}
});

module.exports = GeneTermAnnotation;
