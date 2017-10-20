
exports.up = function(knex, Promise) {
	return knex.schema
		.table('keyword_mapping', (table) => {
			table.dropUnique('eco_id');
			table.foreign('eco_id').references('keyword.external_id');
		});
};

exports.down = function(knex, Promise) {
	return knex.schema
		.table('keyword_mapping', (table) => {
			table.dropForeign('eco_id');
			table.unique('eco_id');
		});
};

