
exports.up = function(knex, Promise) {
	return knex.schema
		.createTable('user', table => {
			table.increments('id');
			table.string('name');
			table.timestamp('created_at').defaultTo(knex.fn.now());
			table.string('orcid_id').unique().notNullable();
			table.string('email_address').unique();

			table.index('orcid_id');
		})
		.createTable('role', table => {
			table.increments('id');
			table.string('name').unique().notNullable();
		})
		.createTable('user_role', table => {
			table.integer('user_id').references('user.id').notNullable();
			table.integer('role_id').references('role.id').notNullable();

			table.primary(['user_id', 'role_id']);
		})
		.createTable('keyword_type', table => {
			table.increments('id');
			table.string('name').unique();
		})
		.createTable('keyword', table => {
			table.increments('id');
			table.integer('keyword_type_id').references('keyword_type.id').notNullable();
			table.string('name');
			table.string('external_id').unique();

			table.index('external_id');
		})
		.createTable('synonym', table => {
			table.increments('id');
			table.integer('keyword_id').references('keyword.id');
			table.string('name');

			table.index('keyword_id');
		})
		.createTable('publication', table => {
			table.increments('id');
			table.string('doi').unique();
			table.string('pubmed_id').unique();
		})
		.createTable('annotation_status', table => {
			table.increments('id');
			table.string('name').unique().notNullable();
		})
		.createTable('annotation', table => {
			table.increments('id');
			table.integer('publication_id').references('publication.id');
			table.integer('status_id').references('annotation_status.id');
			table.integer('submitter_id').references('user.id');
			table.integer('locus_id').notNullable(); // TODO possibly add a reference here
			table.integer('annotation_id').notNullable();
			table.integer('annotation_type').notNullable();
			table.timestamps();
		})
		.createTable('gene_term_annotation', table => {
			table.increments('id');
			table.integer('method_id').references('keyword.id');
			table.integer('keyword_id').references('keyword.id');
			table.integer('evidence_id'); // TODO if we ever have a Locus table, this has a reference to it
		})
		.createTable('gene_gene_annotation', table => {
			table.increments('id');
			table.integer('locus2_id').notNullable(); // TODO see above note about Locus table reference
			table.integer('method_id').references('keyword.id');
		})
		.createTable('comment_annotation', table => {
			table.increments('id');
			table.string('text').notNullable();
		});
};

exports.down = function(knex, Promise) {
	return knex.schema
		.dropTable('user')
		.dropTable('role')
		.dropTable('user_role')
		.dropTable('keyword')
		.dropTable('synonym')
		.dropTable('keyword_type')
		.dropTable('publication')
		.dropTable('annotation_status')
		.dropTable('annotation')
		.dropTable('gene_term_annotation')
		.dropTable('gene_gene_annotation')
		.dropTable('comment_annotation');
};
