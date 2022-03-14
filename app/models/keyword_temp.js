'use strict';

const bookshelf = require('../lib/bookshelf');

require('./keyword_type');
require('./user');
require('./gene_term_annotation');
require('./gene_gene_annotation');

const KeywordTemp = bookshelf.model('KeywordTemp', {
    tableName: 'keyword_temp',
    keywordType: function() {
        return this.belongsTo('KeywordType', 'keyword_type_id');
    },
    submitter: function() {
        return this.belongsTo('User', 'submitter_id');
    },
    geneTermAnnotation: function() {
        return this.hasMany('GeneTermAnnotation', 'temp_method_id');
    },
    geneGeneAnnotation: function() {
        return this.hasMany('GeneGeneAnnotation', 'temp_method_id');
    }
}, {
    addNew: function(params, transaction) {
        return bookshelf.model('KeywordTemp')
            .forge({
                name: params.name,
                keyword_type_id: params.keyword_type_id,
                submitter_id: params.submitter_id,
            })
            .save(null, {
                transacting: transaction
            });
    },
    addOrGet: function(params, transaction) {
        return bookshelf.model('KeywordTemp')
            .where({
                name: params.name,
                keyword_type_id: params.keyword_type_id,
                submitter_id: params.submitter_id,
            })
            .fetch({
                transacting: transaction
            })
            .then(keywordTemp => {
                if (keywordTemp) {
                    return Promise.resolve(keywordTemp);
                } else {
                    return this.addNew(params, transaction);
                }
            });
    },
    // getAll: function (id, transaction) {
    //     return bookshelf.model('KeywordTemp')
    //       .where('id', id)
    //           .fetch({
    //               transacting: transaction
    //           });
    // },
    // getById: function (id, transaction) {
    //   return bookshelf.model('KeywordTemp')
    //     .where('id', id)
    //         .fetch({
    //             transacting: transaction
    //         });
    // },
    // deleteById: function (id, transaction) {
    //     return bookshelf.model('KeywordTemp')
    //       .where('id', id)
    //           .destroy({
    //               transacting: transaction
    //           });
    // },
    // assignKeyword: function (id, transaction) {
    //     return bookshelf.model('KeywordTemp')
    //       .where('id', id)
    //           .fetch({
    //               transacting: transaction
    //           });
    // },
    // editById: function (id, transaction) {
    //     return bookshelf.model('KeywordTemp')
    //       .where('id', id)
    //           .fetch({
    //               transacting: transaction
    //           });
    // }
});

module.exports = KeywordTemp;