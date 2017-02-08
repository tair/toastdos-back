'use strict';

const bookshelf = require('../lib/bookshelf');

require('./external_source');
require('./locus');
require('./user');

const GeneSymbol = bookshelf.model('GeneSymbol', {
	tableName: 'gene_symbol',
	source: function() {
		return this.belongsTo('ExternalSource', 'source_id');
	},
	locus: function() {
		return this.belongsTo('Locus', 'locus_id');
	},
	submitter: function() {
		return this.belongsTo('User', 'submitter_id');
	}
});

module.exports = GeneSymbol;
