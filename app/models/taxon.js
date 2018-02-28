'use strict';

const bookshelf = require('../lib/bookshelf');

require('./locus');

const Taxon = bookshelf.model('Taxon', {
    tableName: 'taxon',
    locuses: function() {
        return this.hasMany('Locus', 'taxon_id');
    }
}, {
    addOrGet: function(params, transaction) {
        return Taxon
			.where({taxon_id: params.taxon_id})
			.fetch({transacting: transaction})
			.then(existingTaxon => {
    if (existingTaxon) {
        return Promise.resolve(existingTaxon);
    } else {
        return Taxon
						.forge({
    taxon_id: params.taxon_id,
    name: params.name
})
						.save(null, {transacting: transaction});
    }
});
    }
});

module.exports = Taxon;
