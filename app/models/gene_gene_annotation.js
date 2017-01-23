'use strict';

const bookshelf = require('../lib/bookshelf');

require('./keyword');
require('./annotation');

let GeneGeneAnnotation = bookshelf.model('GeneGeneAnnotation', {
	tableName: 'gene_gene_annotation',
	method: function() {
		return this.belongsTo('Keyword', 'method_id');
	},
	parentData: function() {
		return this.morphOne('Annotation', 'annotation');
	}
});


module.exports = GeneGeneAnnotation;
