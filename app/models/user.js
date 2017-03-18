'use strict';

const bookshelf = require('../lib/bookshelf');

require('./role');
require('./draft');

const User = bookshelf.model('User', {
	tableName: 'user',
	roles: function() {
		return this.belongsToMany('Role', 'user_role');
	},
	drafts: function() {
		return this.hasMany('Draft', 'submitter_id');
	}
});

module.exports = User;
