
exports.up = function(knex, Promise) {
    return knex.schema
        .createTable('evidence_with', table => {
            table.increments('id');
            table.integer('gene_term_id').notNullable();
            table.integer('subject_id').notNullable();
            table.string('subject_type').notNullable();
        })
};

exports.down = function(knex, Promise) {
    return knex.schema
        .dropTable('evidence_with');
};