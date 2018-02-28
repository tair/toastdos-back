'use strict';

const bookshelf = require('../lib/bookshelf');

require('./user');

const Draft = bookshelf.model('Draft', {
    tableName: 'draft',
    submitter: function() {
        return this.belongsTo('User', 'submitter_id');
    }
});

module.exports = Draft;
