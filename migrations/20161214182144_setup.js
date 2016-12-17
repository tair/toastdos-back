
exports.up = function(knex, Promise) {
	return Promise.all([
		knex.schema.createTable('publication', table => {
			table.increments('id');
			table.string('doi').unique();
			table.string('pubmed_id').unique();
		}),
		knex.schema.createTable('annotation_status', table => {
			table.increments('id');
			table.string('name').unique().notNullable();
		}),
		knex.schema.createTable('annotation', table => {
			table.increments('id');
			table.integer('publication_id').references('publication.id').notNullable();
			table.integer('status_id').references('annotation_status.id').notNullable();
			table.integer('submitter_id').references('user.id').notNullable();
			table.integer('locus_id').notNullable(); // TODO possibly add a reference here
			table.timestamps();
		}),
		knex.schema.createTable('gene_term_annotation', table => {
			table.increments('id');
			table.integer('annotation_id').references('annotation.id').notNullable();
			table.integer('method_id').references('keyword.id').notNullable();
			table.integer('keyword_id').references('keyword.id').notNullable();
			table.integer('evidence_id'); // TODO if we ever have a Locus table, this has a reference to it
		}),
		knex.schema.createTable('gene_gene_annotation', table => {
			table.increments('id');
			table.integer('annotation_id').references('annotation.id').notNullable();
			table.integer('locus2_id').notNullable(); // TODO see above note about Locus table reference
			table.integer('method_id').references('keyword.id').notNullable();
		}),
		knex.schema.createTable('comment_annotation', table => {
			table.increments('id');
			table.integer('annotation_id').references('annotation.id').notNullable();
			table.string('text').notNullable();
		})
	]);
};

exports.down = function(knex, Promise) {
	return Promise.all([
		knex.schema.dropTable('publication'),
		knex.schema.dropTable('annotation_status'),
		knex.schema.dropTable('annotation'),
		knex.schema.dropTable('gene_term_annotation'),
		knex.schema.dropTable('gene_gene_annotation'),
		knex.schema.dropTable('comment_annotation')
	]);
};
