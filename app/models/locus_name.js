'use strict';

const bookshelf = require('../lib/bookshelf');

require('./locus');
require('./external_source');

const LocusName = bookshelf.model('LocusName', {
	tableName: 'locus_name',
	locus: function() {
		return this.belongsTo('Locus', 'locus_id');
	},
	source: function() {
		return this.belongsTo('ExternalSource', 'source_id');
	}
});

module.exports = LocusName;
