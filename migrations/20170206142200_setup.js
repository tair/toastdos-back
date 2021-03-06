
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
			table.timestamp('created_at').defaultTo(knex.fn.now());

			table.primary(['user_id', 'role_id']);
		})
		.createTable('draft', table => {
			table.increments('id').notNullable();
			table.integer('submitter_id').references('user.id').notNullable();
			table.json('wip_state');
			table.timestamp('created_at').defaultTo(knex.fn.now());
		})
		.createTable('keyword_type', table => {
			table.increments('id');
			table.string('name').unique();
			table.timestamp('created_at').defaultTo(knex.fn.now());
		})
		.createTable('keyword', table => {
			table.increments('id');
			table.integer('keyword_type_id').references('keyword_type.id').notNullable();
			table.string('name').notNullable();
			table.string('external_id').unique();
			table.boolean('is_obsolete').defaultTo(false);
			table.timestamp('created_at').defaultTo(knex.fn.now());

			table.index('external_id');
			table.index('name');
		})
		.createTable('synonym', table => {
			table.increments('id');
			table.integer('keyword_id').references('keyword.id');
			table.string('name');
			table.timestamp('created_at').defaultTo(knex.fn.now());

			table.index('keyword_id');
		})
		.createTable('publication', table => {
			table.increments('id');
			table.string('doi').unique();
			table.string('pubmed_id').unique();
			table.timestamp('created_at').defaultTo(knex.fn.now());
		})
		.createTable('annotation_status', table => {
			table.increments('id');
			table.string('name').unique().notNullable();
		})
		.createTable('annotation_type', table => {
			table.increments('id');
			table.string('name').unique().notNullable();
		})
		.createTable('taxon', table => {
			table.increments('id');
			table.integer('taxon_id').unique().notNullable();
			table.string('name').notNullable();
			table.timestamp('created_at').defaultTo(knex.fn.now());

			table.index('taxon_id');
		})
		.createTable('locus', table => {
			table.increments('id');
			table.integer('taxon_id').references('taxon.id').notNullable();
			table.timestamp('created_at').defaultTo(knex.fn.now());
		})
		.createTable('external_source', table => {
			table.increments('id');
			table.string('name').unique().notNullable();
		})
		.createTable('gene_symbol', table => {
			table.increments('id');
			table.integer('locus_id').references('locus.id').notNullable();
			table.string('symbol');
			table.string('full_name');
			table.integer('source_id').references('external_source.id');
			table.integer('submitter_id').references('user.id').notNullable();
			table.timestamp('created_at').defaultTo(knex.fn.now());

			table.index('locus_id');
		})
		.createTable('submission', table => {
			table.increments('id');
			table.integer('submitter_id').references('user.id').notNullable();
			table.integer('publication_id').references('publication.id').notNullable();
			table.timestamps(true, true);
		})
		.createTable('annotation', table => {
			table.increments('id');
			table.integer('publication_id').references('publication.id');
			table.integer('status_id').references('annotation_status.id');
			table.integer('submitter_id').references('user.id');
			table.integer('locus_id').references('locus.id').notNullable();
			table.integer('locus_symbol_id').references('gene_symbol.id');
			table.integer('type_id').references('annotation_type.id').notNullable();
			table.integer('submission_id').references('submission.id').notNullable();
			table.integer('annotation_id').notNullable();
			table.string('annotation_format').notNullable();
			table.timestamps(true, true); // Use Javascript Date format, default to knex.fn.now()

			table.index('publication_id');
			table.index('submitter_id');
		})
		.createTable('gene_term_annotation', table => {
			table.increments('id');
			table.integer('method_id').references('keyword.id');
			table.integer('keyword_id').references('keyword.id');
			table.integer('evidence_id').references('locus.id');
			table.integer('evidence_symbol_id').references('gene_symbol.id');
		})
		.createTable('gene_gene_annotation', table => {
			table.increments('id');
			table.integer('locus2_id').references('locus.id').notNullable();
			table.integer('locus2_symbol_id').references('gene_symbol.id');
			table.integer('method_id').references('keyword.id');
		})
		.createTable('comment_annotation', table => {
			table.increments('id');
			table.string('text').notNullable();
		})
		.createTable('locus_name', table => {
			table.increments('id');
			table.integer('locus_id').references('locus.id').notNullable();
			table.string('locus_name').unique().notNullable();
			table.integer('source_id').references('external_source.id').notNullable();
			table.timestamp('created_at').defaultTo(knex.fn.now());

			table.index('locus_id');
		});
		
};

exports.down = function(knex, Promise) {
	return knex.schema
		.dropTable('user')
		.dropTable('role')
		.dropTable('user_role')
		.dropTable('draft')
		.dropTable('keyword')
		.dropTable('synonym')
		.dropTable('keyword_type')
		.dropTable('publication')
		.dropTable('annotation_status')
		.dropTable('annotation')
		.dropTable('gene_term_annotation')
		.dropTable('gene_gene_annotation')
		.dropTable('comment_annotation')
		.dropTable('locus')
		.dropTable('locus_name')
		.dropTable('gene_symbol')
		.dropTable('taxon')
		.dropTable('external_source');
};
