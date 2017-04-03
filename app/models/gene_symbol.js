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
}, {
	addOrGet: function(params, transaction) {
		return bookshelf.model('GeneSymbol')
			.where({
				full_name: params.full_name,
				symbol: params.symbol
			})
			.fetch({transacting: transaction})
			.then(geneSymbol => {
				if (geneSymbol) {
					return Promise.resolve(geneSymbol);
				} else {
					return bookshelf.model('GeneSymbol')
						.forge({
							symbol: params.symbol,
							full_name: params.full_name,
							locus_id: params.locus_id,
							source_id: params.source_id,
							submitter_id: params.submitter_id
						})
						.save(null, {transacting: transaction});
				}
			})
	}
});

module.exports = GeneSymbol;
