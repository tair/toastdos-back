'use strict';

const bookshelf = require('../lib/bookshelf');

require('./keyword');

const Synonym = bookshelf.model('Synonym', {
    tableName: 'synonym',
    keyword: function() {
        return this.belongsTo('Keyword', 'keyword_id');
    }
}, {
    addAll: function(modelList, transaction) {
        let SynonymSet = bookshelf.Collection.extend({model: Synonym});
        let synonyms = SynonymSet.forge(modelList);
        return synonyms.invokeThen('save', null, {transacting: transaction});
    }
});

module.exports = Synonym;
