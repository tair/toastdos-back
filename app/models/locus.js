'use strict';

const bookshelf = require('../lib/bookshelf');

require('./taxon');
require('./locus_name');
require('./gene_symbol');

const Locus = bookshelf.model('Locus', {
	tableName: 'locus',
	taxon: function() {
		return this.belongsTo('Taxon', 'taxon_id');
	},
	names: function() {
		return this.hasMany('LocusName', 'locus_id');
	},
	symbols: function() {
		return this.hasMany('GeneSymbol', 'locus_id');
	}
}, {
	addNew: function(params, transaction) {
		return bookshelf.model('Locus')
			.forge({taxon_id: params.taxon_id})
			.save(null, {transacting: transaction});
	}
});

module.exports = Locus;
