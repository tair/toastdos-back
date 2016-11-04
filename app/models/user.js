"use strict";

const bookshelf = require('../lib/bookshelf');

require('./car');
require('./role');

let User = bookshelf.model("User", {
	tableName: "user",
	cars: function() {
		return this.hasMany("Car", "owner");
	},
	roles: function() {
		return this.belongsToMany("Role", "user_role")
	}
});

module.exports = User;

