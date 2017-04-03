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
}, {
	getByNameWithRelated: function(name, transaction) {
		return bookshelf.model('LocusName')
			.where('locus_name', name)
			.fetch({
				withRelated: ['locus', 'source'],
				transacting: transaction
			});
	},

	addNew: function(params, transaction) {
		return bookshelf.model('Taxon')
			.addOrGet({
				taxon_id: params.taxon_id,
				name: params.taxon_name
			}, transaction)
			.then(taxon => {
				let sourcePromise = bookshelf.model('ExternalSource').addOrGet({name: params.source}, transaction);
				let locusPromise = bookshelf.model('Locus').addNew({taxon_id: taxon.get('id')}, transaction);
				return Promise.all([sourcePromise, locusPromise]);
			})
			.then(([source, locus]) => {
				return bookshelf.model('LocusName')
					.forge({
						source_id: source.get('id'),
						locus_id: locus.get('id'),
						locus_name: params.locus_name
					})
					.save(null, {transacting: transaction});
			});
	}
});

module.exports = LocusName;
