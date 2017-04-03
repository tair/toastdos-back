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

const PENDING_STATUS = 'pending';
const PAGE_LIMIT = 20;

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

		let publicationPromise = Publication.addOrGet({[publicationType]: req.body.publicationId}, transaction);

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

		// Isolate the different data types
		return Promise.all([
				publicationPromise,
				keywordPromise,
				Promise.all(locusPromises)
			])
			.then(([publication, keywordArray, locusArray]) => {

				// Create a map of the locuses / symbols we added so we can quickly look them up by name
				let locusMap = locusArray.reduce((acc, [locus, symbol]) => {
					acc[locus.attributes.locus_name] = {
						locus: locus,
						symbol: symbol
					};
					return acc;
				}, {});

				// Map created keywords IDs to their names
				let newKeywordMap = keywordArray.reduce((keywordNameIdMap, newKeyword) => {
					keywordNameIdMap[newKeyword.get('name')] = newKeyword.get('id');
					return keywordNameIdMap;
				}, {});

				let annotationPromises = req.body.annotations.map(annotation => {
					// Add created keyword IDs into annotation data
					let keyword = annotation.data.keyword;
					let method = annotation.data.method;

					if (keyword && keyword.name && newKeywordMap[keyword.name]) {
						annotation.data.keyword.id = newKeywordMap[keyword.name];
					}
					if (method && method.name && newKeywordMap[method.name]) {
						annotation.data.method.id = newKeywordMap[method.name];
					}

					// Every Annotation needs a reference to Publication and User ID
					annotation.data.internalPublicationId = publication.attributes.id;
					annotation.data.submitterId = req.user.attributes.id;

					return annotationHelper.addAnnotationRecords(annotation, locusMap, transaction);
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
			seenKeywords[method.name] = 'eco';
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

	// Calculate pagination values
	let itemsPerPage;
	let offset;

	if (!req.query.limit || req.query.limit > PAGE_LIMIT) {
		itemsPerPage = PAGE_LIMIT;
	} else if (req.query.limit < 1) {
		itemsPerPage = 1;
	} else {
		itemsPerPage = req.query.limit;
	}

	if (!req.query.page || req.query.page <= 1) {
		offset = 0;
	} else {
		offset = (req.query.page - 1) * itemsPerPage;
	}

	/* Gets us a list of sub-groups of submissions, separated by status.
	 *
	 * The ordering in the above query guarantees that the sub-groups
	 * for each submission are all adjacent.
	 *
	 * This allows us to get two different counts from a single query.
	 */
	bookshelf.knex
		.with('mod_annotation',
			bookshelf.knex.raw('SELECT id, date(created_at) as created_date FROM annotation')
		)
		.select(
			'publication.doi',
			'publication.pubmed_id',
			'annotation.submitter_id',
			'annotation_status.name',
			'mod_annotation.created_date'
		)
		.count('* as sub_total')
		.from('annotation')
		.leftJoin('mod_annotation', 'annotation.id', 'mod_annotation.id')
		.leftJoin('annotation_status', 'annotation.status_id', 'annotation_status.id')
		.leftJoin('publication', 'annotation.publication_id', 'publication.id')
		.groupBy(
			'mod_annotation.created_date',
			'annotation.submitter_id',
			'publication.id',
			'annotation_status.name'
		)
		.orderByRaw(`
			mod_annotation.created_date DESC,
			annotation.submitter_id,
			publication.id
		`)
		.offset(offset)
		.limit(itemsPerPage)
		.then(submissionChunks => {
			/* We need to manually reduce this list to get the values for 'total'
			 * and 'pending' annotations in each submission.
			 */

			// Subdivide submission chunk list into individual arrays of chunks, grouped by submission
			let subdividedChunkArrays = [];
			let curSubdivisionChunks = [];
			let curSubdivisionKey = {}; // Tells us which submission group we're on
			submissionChunks.forEach(curChunk => {

				// Is this a chunk for a different submission?
				if (! (curSubdivisionKey.submitter_id === curChunk.submitter_id
					&& curSubdivisionKey.created_date === curChunk.created_date
					&& curSubdivisionKey.pubmed_id === curChunk.pubmed_id
					&& curSubdivisionKey.doi === curChunk.doi
					)
				) {
					// Store the REFERENCE to this array, which we will modify later.
					curSubdivisionChunks = [];
					subdividedChunkArrays.push(curSubdivisionChunks);

					// Store keys from this new chunk to match subsequent chunks
					curSubdivisionKey = _.pick(curChunk, ['doi', 'pubmed_id', 'submitter_id', 'created_date']);
				}

				curSubdivisionChunks.push(curChunk);
			});

			// Reduce all the submission groups into single objects
			let submissions = subdividedChunkArrays.map(chunkArray => {
				let submission = {};

				// We're guaranteed to have at least one chunk in the array
				// so use that for our submission values
				let firstChunk = chunkArray[0];

				submission.submission_date = firstChunk.created_date;
				submission.pending = 0;
				submission.total = 0;
				if (firstChunk.doi) {
					submission.document = firstChunk.doi;
				} else if (firstChunk.pubmed_id) {
					submission.document = firstChunk.pubmed_id;
				} else {
					throw new Error('Submission chunk missing valid publication');
				}

				// Sum all the annotation counts together
				chunkArray.forEach(chunk => {
					submission.total += chunk.sub_total;
					if (chunk.name === PENDING_STATUS) {
						submission.pending += chunk.sub_total;
					}
				});

				return submission;
			});

			return response.ok(res, submissions);
		})
		.catch(err => response.defaultServerError(res, err));
}

module.exports = {
	submitGenesAndAnnotations,
	generateSubmissionSummary
};
