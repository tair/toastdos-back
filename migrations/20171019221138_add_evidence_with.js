
exports.up = function(knex, Promise) {
    return knex.schema
        .createTable('evidence_with', table => {
            table.increments('id');
            table.integer('annotation_id').references('annotation.id').notNullable();
            table.integer('subject_id').notNullable();
            table.string('type').notNullable();
        })
        .table('gene_term_annotation', table => {
            table.dropForeign('evidence_id');
            table.dropForeign('evidence_symbol_id');
            table.dropColumn('evidence_id');
            table.dropColumn('evidence_symbol_id');
        });
};

exports.down = function(knex, Promise) {
    return knex.schema
        .table('gene_term_annotation', table => {
            table.integer('evidence_id').references('locus.id');
            table.integer('evidence_symbol_id').references('gene_symbol.id');
        })
        .dropTable('evidence_with');
};
