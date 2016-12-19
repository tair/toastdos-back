"use strict";

const bookshelf = require('../lib/bookshelf');

require('./annotation');

let AnnotationStatus = bookshelf.model('AnnotationStatus', {
	tableName: 'annotation_status',
	annotations: function() {
		return this.hasMany('Annotation', 'status_id');
	}
});

module.exports = AnnotationStatus;
