'use strict';

const bookshelf = require('../lib/bookshelf');

require('./publication');
require('./annotation_status');
require('./user');
require('./keyword');
require('./gene_term_annotation');
require('./gene_gene_annotation');
require('./comment_annotation');

const Annotation = bookshelf.model('Annotation', {
	tableName: 'annotation',
	status: function() {
		return this.belongsTo('AnnotationStatus', 'status_id');
	},
	publication: function() {
		return this.belongsTo('Publication', 'publication_id');
	},
	submitter: function() {
		return this.belongsTo('User', 'submitter_id');
	},
	childData: function() {
		return this.morphTo('annotation', 'GeneTermAnnotation', 'GeneGeneAnnotation', 'CommentAnnotation');
	}
});


module.exports = Annotation;
