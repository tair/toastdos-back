'use strict';

const bookshelf = require('../lib/bookshelf');

require('./keyword_type');
require('./keyword_mapping');

const Keyword = bookshelf.model('Keyword', {
    tableName: 'keyword',
    keywordType: function() {
        return this.belongsTo('KeywordType', 'keyword_type_id');
    },
    synonyms: function() {
        return this.hasMany('Synonym', 'keyword_id');
    },
    keywordMapping: function() {
        return this.hasOne('KeywordMapping', 'eco_id', 'external_id');
    }
}, {
    addNew: function(params, transaction) {
        return bookshelf.model('KeywordType')
			.where('name', params.type_name)
			.fetch({require: true, transacting: transaction})
			.then(keywordType => {
    return bookshelf.model('Keyword')
					.forge({
    name: params.name,
    external_id: params.external_id,
    is_obsolete: params.is_obsolete,
    keyword_type_id: keywordType.get('id'),
})
					.save(null, {transacting: transaction});
});
    },
    addOrGet: function(params, transaction) {
        return bookshelf.model('Keyword')
			.where('name', params.name)
			.fetch({transacting: transaction})
			.then(keyword => {
    if (keyword) {
        return Promise.resolve(keyword);
    } else {
        return addNew(params, transaction);
    }
});
    },
    getByExtId: function(externalId, transaction) {
        return bookshelf.model('Keyword')
			.where('external_id', externalId)
			.fetch({transacting: transaction});
    }
});

module.exports = Keyword;
