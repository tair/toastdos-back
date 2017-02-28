'use strict';

const bookshelf = require('../lib/bookshelf');

require('./annotation');

const AnnotationType = bookshelf.model('AnnotationType', {
	tableName: 'annotation_type',
	annotations: function() {
		return this.hasMany('Annotation', 'type_id');
	}
});

module.exports = AnnotationType;
