
exports.up = function(knex, Promise) {
    return knex.schema
    .table('comment_annotation', (table) => {
        table.string('text', 2000).notNullable().alter();
    });
};

exports.down = function(knex, Promise) {
    return knex.schema
    .table('comment_annotation', (table) => {
        table.string('text').notNullable().alter();
    });
};
