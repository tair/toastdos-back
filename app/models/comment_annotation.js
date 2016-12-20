"use strict";

const bookshelf = require('../lib/bookshelf');

require('./annotation');

let CommentAnnotation = bookshelf.model('CommentAnnotation', {
	tableName: 'comment_annotation',
	parentData: function() {
		return this.morphOne('Annotation', 'annotation');
	}
});


module.exports = CommentAnnotation;
