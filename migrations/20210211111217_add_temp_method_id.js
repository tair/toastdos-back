
exports.up = function(knex, Promise) {
    return knex.schema
		.table('gene_term_annotation', (table) => {
            table.integer('temp_method_id').references('keyword_temp.id');
            table.boolean('is_temp_method').defaultTo(false);
        }).table('gene_gene_annotation', (table) => {
            table.integer('temp_method_id').references('keyword_temp.id');
            table.boolean('is_temp_method').defaultTo(false);
        });
};

exports.down = function(knex, Promise) {
    return knex.schema
        .table('gene_term_annotation', (table) => {
            table.dropColumn('temp_method_id');
            table.dropColumn('is_temp_method');
        }).table('gene_gene_annotation', (table) => {
            table.dropColumn('temp_method_id');
            table.dropColumn('is_temp_method');
        });
};

