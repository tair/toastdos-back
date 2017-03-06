'use strict';

const bookshelf = require('../lib/bookshelf');

require('./role');

const User = bookshelf.model('User', {
	tableName: 'user',
	roles: function() {
		return this.belongsToMany('Role', 'user_role')
	},
	draft: function() {
		return this.hasMany('Draft', 'submitter_id')
	}
});

module.exports = User;
