// Use this seed with `npm run exec knex seed:run`

const testdata = require('./test_data.json');
const proddataAdder = require('../prod_data');

exports.seed = function(knex, Promise) {
	// NOTE These tables need to be dropped in a particular order to avoid FK constraint errors
	return Promise.all([
		knex('synonym').truncate(),
		knex('gene_term_annotation').truncate(),
		knex('gene_gene_annotation').truncate(),
		knex('comment_annotation').truncate(),
		knex('annotation').truncate(),
		knex('annotation_type').truncate(),
		knex('keyword').truncate(),
		knex('keyword_type').truncate(),
		knex('draft').truncate(),
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
			...testdata.taxon.map(taxon => knex('taxon').insert(taxon)),
			...testdata.external_source.map(externalSource => knex('external_source').insert(externalSource)),
			...testdata.locus.map(locus => knex('locus').insert(locus)),
			...testdata.locus_name.map(locusName => knex('locus_name').insert(locusName)),
			...testdata.users.map(user => knex('user').insert(user)),
			...testdata.gene_symbol.map(geneSymbol => knex('gene_symbol').insert(geneSymbol)),
			...testdata.keyword_types.map(keywordType => knex('keyword_type').insert(keywordType)),
			...testdata.keywords.map(keyword => knex('keyword').insert(keyword)),
			...testdata.synonyms.map(synonym => knex('synonym').insert(synonym)),
			...testdata.publications.map(publication => knex('publication').insert(publication)),
			...testdata.annotation_statuses.map(status => knex('annotation_status').insert(status)),
			...testdata.annotation_types.map(type => knex('annotation_type').insert(type)),
			...testdata.annotations.map(annotation => knex('annotation').insert(annotation)),
			...testdata.gene_term_annotations.map(gtAnnotation => knex('gene_term_annotation').insert(gtAnnotation)),
			...testdata.gene_gene_annotations.map(ggAnnotation => knex('gene_gene_annotation').insert(ggAnnotation)),
			...testdata.comment_annotations.map(cAnnotation => knex('comment_annotation').insert(cAnnotation)),
			...testdata.draft.map(draft => {
				// Have to stringify the wip_state otherwise it doesn't get added
				let stringifiedDraft = Object.assign({}, draft);
				stringifiedDraft.wip_state = JSON.stringify(draft.wip_state);
				return knex('draft').insert(stringifiedDraft);
			})
		]).then(() => proddataAdder.seed(knex, Promise));
	});
};
