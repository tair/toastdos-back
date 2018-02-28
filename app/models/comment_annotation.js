'use strict';

const bookshelf = require('../lib/bookshelf');

require('./annotation');

const CommentAnnotation = bookshelf.model('CommentAnnotation', {
    tableName: 'comment_annotation',
    parentData: function() {
        return this.morphOne('Annotation', 'annotation', ['annotation_format', 'annotation_id']);
    }
});

module.exports = CommentAnnotation;
