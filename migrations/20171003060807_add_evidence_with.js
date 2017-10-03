
exports.up = function(knex, Promise) {
    return knex.schema
        .createTable('evidence_with', table => {
            table.increments('id');
            table.integer('annotation_id').references('annotation.id').notNullable();
            table.integer('locus_id').references('locus.id').notNullable();
            table.string('type').notNullable();
        });
};

exports.down = function(knex, Promise) {
    return knex.schema
        .dropTable('evidence_with');
};
