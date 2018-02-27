
exports.up = function(knex, Promise) {
    return knex.schema
		.table('gene_term_annotation', (table) => {
            table.boolean('is_evidence_with_or').defaultTo(true);
        });
};

exports.down = function(knex, Promise) {
    return knex.schema
        .table('gene_term_annotation', (table) => {
            table.dropColumn('is_evidence_with_or');
        });
};
