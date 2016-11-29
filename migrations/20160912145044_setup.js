
exports.up = function(knex, Promise) {
	return Promise.all([
		knex.schema.createTable('user', table => {
			table.increments('id');
			table.string('name');
			table.timestamp('created_at').defaultTo(knex.fn.now());
			table.string('orcid_id').unique().notNullable();
			table.string('email_address').unique();

			table.index('orcid_id');
		}),
		knex.schema.createTable('car', table => {
			table.increments('id');
			table.string('make');
			table.string('model');
			table.integer('year');
			table.integer('owner').references('user.id');
		}),
		knex.schema.createTable('role', table => {
			table.increments('id');
			table.string('name').unique().notNullable();
		}),
		knex.schema.createTable('user_role', table => {
			table.integer('user_id').references('user.id').notNullable();
			table.integer('role_id').references('role.id').notNullable();
		}),
		knex.schema.createTable('keyword', table => {
			table.increments('id');
			table.integer('keyword_type_id').references('keyword_type.id').notNullable();
			table.string('name');
			table.string('external_id').unique();

			table.index('external_id');
		}),
		knex.schema.createTable('synonym', table => {
			table.increments('id');
			table.integer('keyword_id').references('keyword.id').notNullable();
			table.string('name');

			table.index('keyword_id');
		}),
		knex.schema.createTable('keyword_type', table => {
			table.increments('id');
			table.string('name').unique();
		})

	]);
};

exports.down = function(knex, Promise) {
	return Promise.all([
		knex.schema.dropTable('user'),
		knex.schema.dropTable('car'),
		knex.schema.dropTable('role'),
		knex.schema.dropTable('user_role'),
		knex.schema.dropTable('keyword'),
		knex.schema.dropTable('synonym'),
		knex.schema.dropTable('keyword_type')
	]);
};
