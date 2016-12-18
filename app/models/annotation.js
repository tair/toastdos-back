"use strict";

const bookshelf = require('../lib/bookshelf');

require('./publication');
require('./annotation_status');
require('./user');
require('./keyword');

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
	fullAnnotation: function() {
		return this.morphTo('annotation_id', GeneTermAnnotation, GeneGeneAnnotation, CommentAnnotation);
	}
});

let GeneTermAnnotation = bookshelf.model('GeneTermAnnotation', {
	tableName: 'gene_term_annotation',
	method: function() {
		return this.hasOne('Keyword', 'method_id');
	},
	keyword: function() {
		return this.hasOne('Keyword', 'keyword_id');
	},
	fullAnnotation: function() {
		return this.morphOne(Annotation, 'annotation_id');
	}
});

let GeneGeneAnnotation = bookshelf.model('GeneGeneAnnotation', {
	tableName: 'gene_gene_annotation',
	method: function() {
		return this.hasOne('Keyword', 'method_id');
	},
	fullAnnotation: function() {
		return this.morphOne(Annotation, 'annotation_id');
	}
});

let CommentAnnotation = bookshelf.model('CommentAnnotation', {
	tableName: 'comment_annotation',
	fullAnnotation: function() {
		return this.morphOne(Annotation, 'annotation_id');
	}
});


module.exports = {
	Annotation,
	GeneTermAnnotation,
	GeneGeneAnnotation,
	CommentAnnotation
};
