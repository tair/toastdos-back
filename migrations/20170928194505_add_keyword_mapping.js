
exports.up = function(knex, Promise) {
	return knex.schema
		.createTable('keyword_mapping', table => {
			table.string('eco_id').unique().notNullable();
			table.string('evidence_code').notNullable();

			table.primary('eco_id');
		});
};

exports.down = function(knex, Promise) {
	return knex.schema
		.dropTable('keyword_mapping');
};
