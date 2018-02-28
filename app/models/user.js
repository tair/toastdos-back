'use strict';

const bookshelf = require('../lib/bookshelf');

require('./role');
require('./draft');
require('./submission');

const User = bookshelf.model('User', {
    tableName: 'user',
    roles: function() {
        return this.belongsToMany('Role', 'user_role');
    },
    drafts: function() {
        return this.hasMany('Draft', 'submitter_id');
    },
    submissions: function() {
        return this.hasMany('Submission', 'submitter_id');
    }
});

module.exports = User;