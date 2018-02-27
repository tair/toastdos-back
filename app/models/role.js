'use strict';

const bookshelf = require('../lib/bookshelf');

require('./user');

const Role = bookshelf.model('Role', {
    tableName: 'role',
    users: function() {
        return this.belongsToMany('User', 'user_role');
    }
});

module.exports = Role;
