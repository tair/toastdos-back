"use strict";

const bookshelf = require('../lib/bookshelf');

require('./publication');
require('./annotation_status');
require('./user');
require('./keyword');
require('./gene_term_annotation');
require('./gene_gene_annotation');
require('./comment_annotation');

let Annotation = bookshelf.model('Annotation', {
	tableName: 'annotation',
	status: function() {
		return this.hasOne('AnnotationStatus', 'status_id');
	},
	publication: function() {
		return this.hasOne('Publication', 'publication_id');
	},
	user: function() {
		return this.hasOne('User', 'submitter_id');
	},
	childData: function() {
		return this.morphTo('annotation_id', 'GeneTermAnnotation', 'GeneGeneAnnotation', 'CommentAnnotation');
	}
});


module.exports = Annotation;
