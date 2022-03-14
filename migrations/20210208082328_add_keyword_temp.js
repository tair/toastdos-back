
exports.up = function(knex, Promise) {
	return knex.schema
		.createTable('keyword_temp', table => {
			table.increments('id');
			table.integer('keyword_type_id').references('keyword_type.id').notNullable();
			table.string('name').notNullable();
			table.string('external_id').unique();
			table.boolean('is_obsolete').defaultTo(false);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.integer('submitter_id').references('user.id').notNullable();            
            table.boolean('requested').defaultTo(false);
            table.integer('confirmed_as').references('keyword.id');

			table.index('external_id');
			table.index('name');
		});
};

exports.down = function(knex, Promise) {
	return knex.schema
		.dropTable('keyword_temp');
};