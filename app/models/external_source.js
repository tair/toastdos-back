'use strict';

const bookshelf = require('../lib/bookshelf');

require('./locus_name');

const ExternalSource = bookshelf.model('ExternalSource', {
    tableName: 'external_source',
    locusNames: function() {
        return this.hasMany('LocusName', 'source_id');
    }
}, {
    addOrGet: function(params, transaction) {
        return bookshelf.model('ExternalSource')
			.where({name: params.name})
			.fetch({transacting: transaction})
			.then(existingSource => {
    if (existingSource) {
        return Promise.resolve(existingSource);
    } else {
        return bookshelf.model('ExternalSource')
						.forge({name: params.name})
						.save(null, {transacting: transaction});
    }
});
    }
});

module.exports = ExternalSource;
