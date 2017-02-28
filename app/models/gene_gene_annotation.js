'use strict';

const bookshelf = require('../lib/bookshelf');

require('./keyword');
require('./annotation');
require('./locus');

const GeneGeneAnnotation = bookshelf.model('GeneGeneAnnotation', {
	tableName: 'gene_gene_annotation',
	method: function() {
		return this.belongsTo('Keyword', 'method_id');
	},
	locus2: function() {
		return this.belongsTo('Locus', 'locus2_id');
	},
	parentData: function() {
		return this.morphOne('Annotation', 'annotation', ['annotation_format', 'annotation_id']);
	}
});

module.exports = GeneGeneAnnotation;
