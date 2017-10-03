'use strict';

const bookshelf = require('../lib/bookshelf');

require('./keyword');

const KeywordMapping = bookshelf.model('KeywordMapping', {
	tableName: 'keyword_mapping',
	idAttribute: 'eco_id',
	eco_id: function() {
		return this.hasOne('Keyword', 'eco_id', 'external_id');
    }
}, {
	getByEcoId: function(eco_id, transaction) {
		return bookshelf.model('KeywordMapping')
			.where('eco_id', eco_id)
			.fetch({transacting: transaction});
    },
    addNew: function(params, transaction) {
        return bookshelf.model('KeywordMapping')
            .forge({
                eco_id: params.eco_id,
                evidence_code: params.evidence_code
            })
            .save(null, {transacting: transaction, method: 'insert'});
    },
	addOrGet: function(params, transaction) {
		return bookshelf.model('KeywordMapping')
			.where('eco_id', params.eco_id)
			.fetch({transacting: transaction})
			.then(keywordMapping => {
				if (keywordMapping) {
					return Promise.resolve(keywordMapping);
				} else {
					return KeywordMapping.addNew(params, transaction);
				}
			});
	},
    clearAll: function(params, transaction) {
        return bookshelf.knex('keyword_mapping').truncate();
    }
});

module.exports = KeywordMapping;
