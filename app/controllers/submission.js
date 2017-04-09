'use strict';

const _ = require('lodash');

const bookshelf            = require('../lib/bookshelf');
const response             = require('../lib/responses');
const locusHelper          = require('../lib/locus_submission_helper');
const annotationHelper     = require('../lib/annotation_submission_helper');
const publicationValidator = require('../lib/publication_id_validator');

const Publication = require('../models/publication');
const Annotation  = require('../models/annotation');
const Keyword     = require('../models/keyword');
const Submission  = require('../models/submission');

const PENDING_STATUS = 'pending';
const PAGE_LIMIT = 20;
const METHOD_KEYWORD_TYPE_NAME = 'eco';

const GENE_GENE_TYPE = 'PROTEIN_INTERACTION';
const COMMENT_TYPE = 'COMMENT';


/**
 * Creates records for all of the new Locuses and Annotations.
 * Performs all of the database additions inside a transaction,
 * and if anything goes wrong, the entire thing is rolled back.
 *
 * Responds with:
 * 201 with empty body on successful add.
 * 400 with text describing problem with request.
 * 500 if something blows up on our end.
 */
function submitGenesAndAnnotations(req, res, next) {

	// Ensure we actually provided a list of genes and annotations
	if (!req.body.genes || req.body.genes.length === 0) {
		return response.badRequest(res, 'No genes specified');
	}

	if (!req.body.annotations || req.body.annotations.length === 0) {
		return response.badRequest(res, 'No annotations specified');
	}

	// Ensure each locus provides a name
	if (req.body.genes.some(gene => !gene.locusName)) {
		return response.badRequest(res, 'Body contained malformed Gene data');
	}

	// Ensure each annotation supplies type information and data
	if (req.body.annotations.some(ann => (!ann.type || !ann.data) )) {
		return response.badRequest(res, 'Body contained malformed Annotation data');
	}

	// Validate Annotation type
	let foundBadAnnType = req.body.annotations.find(ann => !annotationHelper.AnnotationTypeData[ann.type]);
	if (foundBadAnnType) {
		return response.badRequest(res, `Invalid annotation type ${foundBadAnnType.type}`);
	}

	// Publication ID validation / type detection
	let publicationType;
	if (publicationValidator.isDOI(req.body.publicationId)) {
		publicationType = 'doi';
	} else if (publicationValidator.isPubmedId(req.body.publicationId)) {
		publicationType = 'pubmed_id';
	} else {
		return response.badRequest(res, `${req.body.publicationId} is not a DOI or Pubmed ID`);
	}

	// Perform the whole addition in a transaction so we can rollback if something goes horribly wrong.
	bookshelf.transaction(transaction => {

		return Publication.addOrGet({
				[publicationType]: req.body.publicationId
			}, transaction)
			.then(publication => {

				let submissionPromise = Submission.addNew({
					publication_id: publication.get('id'),
					submitter_id: req.user.get('id')
				}, transaction);

				let keywordPromise = addNewKeywords(req.body.annotations, transaction);

				// Add all of the genes for the submission
				let locusPromises = req.body.genes.map(gene => {
					return locusHelper.addLocusRecords({
						name: gene.locusName,
						full_name: gene.fullName,
						symbol: gene.geneSymbol,
						submitter_id: req.user.attributes.id
					}, transaction);
				});

				// Group the promises by data type
				return Promise.all([
					Promise.resolve(publication), // Carry data into next promise
					submissionPromise,
					keywordPromise,
					Promise.all(locusPromises)
				])
			})
			.then(([publication, submission, keywordArray, locusArray]) => {

				// Create a map of the locuses / symbols we added so we can quickly look them up by name
				let locusMap = locusArray.reduce((acc, [locus, symbol]) => {
					acc[locus.attributes.locus_name] = {
						locus: locus,
						symbol: symbol
					};
					return acc;
				}, {});

				// Create a map of the Keywords we added so we can quickly look them up by name
				let newKeywordMap = keywordArray.reduce((keywordNameIdMap, newKeyword) => {
					keywordNameIdMap[newKeyword.get('name')] = newKeyword.get('id');
					return keywordNameIdMap;
				}, {});

				let annotationPromises = req.body.annotations.map(annotation => {
					// Add created keyword IDs into annotation data
					let keyword = annotation.data.keyword;
					let method = annotation.data.method;

					// Methods and keywords are not present in all Annotations
					if (keyword && keyword.name && newKeywordMap[keyword.name]) {
						annotation.data.keyword.id = newKeywordMap[keyword.name];
					}
					if (method && method.name && newKeywordMap[method.name]) {
						annotation.data.method.id = newKeywordMap[method.name];
					}

					// These fields exist on all Annotations
					annotation.data.internalPublicationId = publication.attributes.id;
					annotation.data.submitterId = req.user.attributes.id;

					return annotationHelper.addAnnotationRecords(annotation, locusMap, submission, transaction);
				});

				return Promise.all(annotationPromises);
			});
	})
		.then(annotationArray => {
			// NOTE: Transaction is automatically committed on successful promise resolution
			response.created(res);
		})
		.catch(err => {
			// NOTE: Transaction is automatically rolled back on error

			// This covers any validation / verification errors in submission
			if (   err.message.includes('No Locus found')
				|| err.message.includes('Invalid annotation types')
				|| err.message.match(/(Missing|Invalid) .* fields/)
				|| err.message.includes('id xor name')
				|| err.message.includes('not present in submission')
				|| err.message.includes('does not reference existing Keyword')
			) {
				return response.badRequest(res, err.message);
			}

			response.defaultServerError(res, err);
		});
}

/**
 * Adds all of the new Keywords specified in the list of Annotations.
 * Returns promise that resolves to the list of the added Keywords.
 */
function addNewKeywords(annotations, transaction) {
	// Build a map of new Keyword names to KeywordType names (the map prevents duplicates)
	let keywordTypeMap = annotations.reduce((seenKeywords, annotation) => {
		let method = annotation.data.method;
		let keyword = annotation.data.keyword;

		if (method && method.name) {
			seenKeywords[method.name] = METHOD_KEYWORD_TYPE_NAME;
		}

		if (keyword && keyword.name) {
			seenKeywords[keyword.name] = annotationHelper.AnnotationTypeData[annotation.type].keywordScope;
		}

		return seenKeywords;
	}, {});

	// Now add the new Keywords
	let keywordPromises = Object.keys(keywordTypeMap).map(newKeywordName => {
		return Keyword.addNew({name: newKeywordName, type_name: keywordTypeMap[newKeywordName]}, transaction);
	});

	return Promise.all(keywordPromises);
}

/**
 * Gets a list of submissions.
 * Submissions are a transient model in our system. They're represented by the
 * list of all annotations that share a publication id, submitter id, and
 * submission date.
 *
 * Query params:
 * limit - Number of results to fetch. Defaults to / hard capped at PAGE_LIMIT.
 * page - Page of results to start on. Defaults to 1.
 *
 * Responses:
 * 200 with submission list in body
 * 500 if something internally goes wrong
 */
function generateSubmissionSummary(req, res, next) {

	// Constrain / validate pagination values
	let itemsPerPage;
	let page;

	if (!req.query.limit || req.query.limit > PAGE_LIMIT) {
		itemsPerPage = PAGE_LIMIT;
	} else if (req.query.limit < 1) {
		itemsPerPage = 1;
	} else {
		itemsPerPage = req.query.limit;
	}

	if (!req.query.page || req.query.page <= 1) {
		page = 1;
	} else {
		page = req.query.page;
	}

	Submission
		.query(qb => {}) // Necessary to chain into orderBy
		.orderBy('created_at', 'DESC')
		.fetchPage({
			page: page,
			pageSize: itemsPerPage,
			withRelated: ['publication', 'submitter', 'annotations.status'],
		})
		.then(submissionCollection => {
			let submissions = submissionCollection.map(submissionModel => {
				let publication = submissionModel.related('publication');
				let annotations = submissionModel.related('annotations');
				return {
					id: submissionModel.get('id'),
					document: publication.get('doi') || publication.get('pubmed_id'),
					total: annotations.size(),
					pending: annotations.filter(ann => ann.related('status').get('name') === PENDING_STATUS).length,
					submission_date: new Date(submissionModel.get('created_at')).toISOString()
				};
			});

			return response.ok(res, submissions);
		})
		.catch(err => response.defaultServerError(res, err));
}

/**
 * Gets a single submission with all annotation / gene data.
 *
 * Responses:
 * 200 with submission body
 * 400 if given parameters are bad
 * 500 if something goes wrong internally
 */
function getSingleSubmission(req, res, next) {
	Submission
		.where('id', req.params.id)
		.fetch({withRelated: [
			'submitter',
			'publication',
			'annotations.childData',
			'annotations.locus.names',
			'annotations.locusSymbol',
		]})
		.then(submission => {
			// Get additional annotation data needed for submission
			let additionalDataPromises = submission.related('annotations').map(annotation => {

				if (annotation.get('annotation_format') === 'gene_term_annotation') {
					return annotation.fetch({withRelated: [
						'childData.method',
						'childData.keyword',
						'childData.evidence',
						'childData.evidenceSymbol'
					]});
				}

				if (annotation.get('annotation_format') === 'gene_gene_annotation') {
					return annotation.fetch({withRelated: [
						'childData.method',
						'childData.locus2',
						'childData.locus2Symbol'
					]});
				}

				if (annotation.get('annotation_format') === 'comment_annotation') {
					return Promise.resolve(annotation);
				}
			});

			return Promise.all([Promise.resolve(submission), Promise.all(additionalDataPromises)])
		})
		.then(([submission, loadedAnnotations]) => {
		
			// Build list of loci for this submission. Use a map to prevent duplicates.
			let locusList = _.values(submission.related('annotations').reduce((list, annotation) => {
				let locusName = annotation.related('locus').related('names').first().get('locus_name');

				list[locusName] = {
					id: annotation.related('locus').get('id'),
					locusName: locusName,
					geneSynmbol: annotation.related('locusSymbol').get('symbol'),
					fullName: annotation.related('locusSymbol').get('full_name')
				};

				return list;
			}, {}));

			// Refine array of annotations
			let annotationList = submission.related('annotations').map(annotation => {
				let refinedAnn = {
					id: annotation.get('id'),
					data: {
						locusName: annotation.related('locus').related('names').first().get('locus_name'),
					}
				};

				// Data changes based on annotation type
				if (annotation.get('annotation_format') === 'gene_term_annotation') {

				}
				else if (annotation.get('annotation_format') === 'gene_gene_annotation') {
					refinedAnn.type = GENE_GENE_TYPE;
				}
				else { //if (annotation.get('annotation_format') === 'comment_annotation')
					refinedAnn.type = COMMENT_TYPE;
					refinedAnn.data.comment = annotation.related('childData').get('text');
				}

			});

			return response.serverError(res, 'Not yet implemented');
		})
		.catch(err => {
			console.error(err);
			response.defaultServerError(res, err)
		});
}


module.exports = {
	submitGenesAndAnnotations,
	generateSubmissionSummary,
	getSingleSubmission
};
