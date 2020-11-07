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
        // Symbol and fullname are optional. Check them to avoid undefined binding errors
        let query = {};
        query.full_name = params.full_name;
        query.symbol = params.symbol;
        if (params.locus_id) query.locus_id = params.locus_id;

        return bookshelf.model('GeneSymbol')
            .where(query)
            .fetch({
                transacting: transaction
            })
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
                        .save(null, {
                            transacting: transaction
                        });
                }
            });
    }
});

module.exports = GeneSymbol;