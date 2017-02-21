'use strict';

const bookshelf = require('../lib/bookshelf');

require('./locus_name');

const ExternalSource = bookshelf.model('ExternalSource', {
	tableName: 'external_source',
	locusNames: function() {
		return this.hasMany('LocusName', 'source_id');
	}
});

module.exports = ExternalSource;
