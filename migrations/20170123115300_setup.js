
exports.up = function(knex, Promise) {
	return Promise.all([
		knex.schema.dropTable('car')
	]);
};

exports.down = function(knex, Promise) {
	return Promise.all([
		knex.schema.createTable('car', table => {
			table.increments('id');
			table.string('make');
			table.string('model');
			table.integer('year');
			table.integer('owner').references('user.id');
		})
	]);
};
