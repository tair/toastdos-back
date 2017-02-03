'use strict';

const bookshelf = require('../lib/bookshelf');

require('./role');

const User = bookshelf.model('User', {
	tableName: 'user',
	roles: function() {
		return this.belongsToMany('Role', 'user_role')
	}
});

module.exports = User;
