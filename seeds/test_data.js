// Use this seed with `npm run exec knex seed:run test_data`

const testdata = require('./test_data.json');

exports.seed = function(knex, Promise) {
	// NOTE These tables need to be dropped in a particular order to avoid FK constraint errors
	return Promise.all([
		knex('synonym').truncate(),
		knex('gene_term_annotation').truncate(),
		knex('gene_gene_annotation').truncate(),
		knex('comment_annotation').truncate(),
		knex('annotation').truncate(),
		knex('keyword').truncate(),
		knex('keyword_type').truncate(),
		knex('publication').truncate(),
		knex('annotation_status').truncate(),
		knex('locus_name').truncate(),
		knex('gene_symbol').truncate(),
		knex('user').truncate(),
		knex('locus').truncate(),
		knex('taxon').truncate(),
		knex('external_source').truncate()
	]).then(() => {
		return Promise.all([
			].concat(
				testdata.taxon.map(taxon => knex('taxon').insert(taxon))
			).concat(
				testdata.external_source.map(externalSource => knex('external_source').insert(externalSource))
			).concat(
				testdata.locus.map(locus => knex('locus').insert(locus))
			).concat(
				testdata.locus_name.map(locusName => knex('locus_name').insert(locusName))
			).concat(
				testdata.users.map(user => knex('user').insert(user))
			).concat(
				testdata.gene_symbol.map(geneSymbol => knex('gene_symbol').insert(geneSymbol))
			).concat(
				testdata.keyword_types.map(keywordType => knex('keyword_type').insert(keywordType))
			).concat(
				testdata.keywords.map(keyword => knex('keyword').insert(keyword))
			).concat(
				testdata.synonyms.map(synonym => knex('synonym').insert(synonym))
			).concat(
				testdata.publications.map(publication => knex('publication').insert(publication))
			).concat(
				testdata.annotation_statuses.map(status => knex('annotation_status').insert(status))
			).concat(
				testdata.annotations.map(annotation => knex('annotation').insert(annotation))
			).concat(
				testdata.gene_term_annotations.map(gtAnnotation => knex('gene_term_annotation').insert(gtAnnotation))
			).concat(
				testdata.gene_gene_annotations.map(ggAnnotation => knex('gene_gene_annotation').insert(ggAnnotation))
			).concat(
				testdata.comment_annotations.map(cAnnotation => knex('comment_annotation').insert(cAnnotation))
			)
		);
	});
};
