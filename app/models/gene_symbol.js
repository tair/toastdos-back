'use strict';

const bookshelf = require('../lib/bookshelf');

require('./external_source');
require('./locus');

const GeneSymbol = bookshelf.model('GeneSymbol', {
	tableName: 'gene_symbol',
	source: function() {
		return this.belongsTo('ExternalSource', 'source_id');
	},
	locus: function() {
		return this.belongsTo('Locus', 'locus_id');
	}
});

module.exports = GeneSymbol;
