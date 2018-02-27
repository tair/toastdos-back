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
const PAGE_LIMIT = 200;
const METHOD_KEYWORD_TYPE_NAME = 'eco';


/**
 * Determines if an error message could have come from validation.
 * @param {Error|ValidationError} err
 */
function isValidationError(err) {
	return (
		   err instanceof ValidationError
		|| err.message.includes('No Locus found')
		|| err.message.includes('Invalid annotation types')
		|| err.message.match(/(Missing|Invalid) .* fields/)
		|| err.message.includes('id xor name')
		|| err.message.includes('not present in submission')
		|| err.message.includes('does not reference existing Keyword')
		|| err.message.includes('need a status')
	);
}

/**
 * A wrapper for all validation error messages
 * @param {String} message 
 */
function ValidationError(message) {
	this.message = message;
}

/**
 * A submission request to be structurally validated
 * @param {*} submission
 */
function validateSubmissionRequest(submission) {
	const result = {
		publicationType: null
	};

	let error = (message) => {
		return Promise.reject(new ValidationError(message));
	};

	// Ensure we actually provided a list of genes and annotations
	if (!submission.genes || submission.genes.length === 0) {
		return error('No genes specified');
	}

	if (!submission.annotations || submission.annotations.length === 0) {
		return error('No annotations specified');
	}

	// Ensure each locus provides a name
	if (submission.genes.some(gene => !gene.locusName)) {
		return error('Body contained malformed Gene data');
	}

	// Ensure each annotation supplies type information and data
	if (submission.annotations.some(ann => (!ann.type || !ann.data) )) {
		return error('Body contained malformed Annotation data');
	}

	// Validate Annotation type
	let foundBadAnnType = submission.annotations.find(ann => !annotationHelper.AnnotationTypeData[ann.type]);
	if (foundBadAnnType) {
		return error(`Invalid annotation type ${foundBadAnnType.type}`);
	}

	// Publication ID validation / type detection
	if (publicationValidator.isDOI(submission.publicationId)) {
		result.publicationType = 'doi';
	} else if (publicationValidator.isPubmedId(submission.publicationId)) {
		result.publicationType = 'pubmed_id';
	} else {
		return error(`${submission.publicationId} is not a DOI or Pubmed ID`);
	}

	return Promise.resolve(result);
}

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

	handleSubmissionOrCurationResponse(res, validateSubmissionRequest(req.body).then(validationResult => {
		// Submission-only validation
		if (!req.body.annotations.every(a => typeof a.status === 'undefined' && typeof a.id === 'undefined')) {
			return Promise.reject('Annotations cannot have a status or an id');
		}
		
		return performSubmissionOrCuration(req, validationResult, null);
	}));
	
}

/**
 * Makes the common submission or curation workflows happen
 * @param {*} req - the request to respond to
 * @param {*} validationResult - the validation result
 * @param {*} existingSubmissionModel - the presence of this means that we are curating this submission
 */
function performSubmissionOrCuration(req, validationResult, existingSubmissionModel) {
	// Perform the whole addition in a transaction so we can rollback if something goes horribly wrong.
	return bookshelf.transaction(transaction => {
		const isCuration = !!existingSubmissionModel;

		return Publication.addOrGet({
				[validationResult.publicationType]: req.body.publicationId
			}, transaction)
			.then(publication => {
				let submissionPromise;
				if (isCuration) {
					// If there is already an existing submission, update the publication id if it is different.
					if (existingSubmissionModel.get('publication_id') != publication.get('id')) {
						submissionPromise = existingSubmissionModel
							.save('publication_id', publication.get('id'), {transacting: transaction});
					} else {
						submissionPromise = Promise.resolve(existingSubmissionModel);
					}
				} else {
					submissionPromise = Submission.addNew({
						publication_id: publication.get('id'),
						submitter_id: req.user.get('id')
					}, transaction);
				}

				let keywordPromise = addNewKeywords(req.body.annotations, transaction);

				// Make a list of all evidence with loci
				let ewLociNames = [];
				req.body.annotations
					.filter(ann =>
						annotationHelper.AnnotationTypeData[ann.type].format.name == "gene_term_annotation" && 
						ann.data.evidenceWith && 
						ann.data.evidenceWith.length > 0)
					.map(ann => {
						ewLociNames = ewLociNames.concat(ann.data.evidenceWith);
					});

				let locusMap = {};

				// Add all of the genes for the submission
				req.body.genes
					.map(gene => {
						locusMap[gene.locusName] = {
							name: gene.locusName,
							full_name: gene.fullName,
							symbol: gene.geneSymbol,
							submitter_id: req.user.attributes.id
						}
					});

				ewLociNames.map(locusName => {
					if (!(locusName in locusMap)) {
						locusMap[locusName] =  {
							name: locusName,
							full_name: null,
							symbol: null,
							submitter_id: req.user.attributes.id
						};
					}
				});

				let locusPromises = _.values(locusMap)
					.map(locus => locusHelper.addLocusRecords(locus, transaction));


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

					return annotationHelper.addAnnotationRecords(isCuration, annotation, locusMap, submission, transaction);
				});

				return Promise.all(annotationPromises);
			}).then(() => isCuration);
	});
}

/**
 * Handles the response to send from submission or curation.
 * @param {*} res 
 * @param {Promise} promise 
 */
function handleSubmissionOrCurationResponse(res, promise) {
	promise.then(isCuration => {
		// NOTE: Transaction is automatically committed on successful promise resolution
		if (isCuration) {
			response.ok(res);
		} else {
			response.created(res);
		}
	})
	.catch(err => {
		// NOTE: Transaction is automatically rolled back on error

		if (err.message.includes('EmptyResponse')) {
			return response.notFound(res, 'No submission found for the supplied ID')
		}

		// This covers any validation / verification errors in submission
		if (isValidationError(err)) {
			return response.badRequest(res, err.message);
		}

		response.defaultServerError(res, err);
	});
}

/**
 * Internal helper function that will retrieve a submission with the relevant
 * annotation data.
 * @param {Number} id
 */
function getSubmissionWithData(id) {
	return Submission.where('id', id)
		.fetch({
			require: true,
			withRelated: [
				'submitter',
				'publication',
				'annotations.status',
				'annotations.type',
				'annotations.childData',
				'annotations.locus.names',
				'annotations.locusSymbol',
			]
		})
		.then(submission => {
			// Get additional annotation data needed for submission.
			// The data we need changes slightly based on annotation format
			let additionalDataPromises = submission.related('annotations').map(annotation => {
				if (annotation.get('annotation_format') === 'gene_term_annotation') {
					return annotation.load([
						'childData.method',
						'childData.method.keywordMapping',
						'childData.keyword',
						'childData.evidenceWith',
						'childData.evidenceWith.subject.names'
					]);
				}

				if (annotation.get('annotation_format') === 'gene_gene_annotation') {
					return annotation.load([
						'childData.method',
						'childData.locus2.names',
						'childData.locus2Symbol'
					]);
				}

				if (annotation.get('annotation_format') === 'comment_annotation') {
					return Promise.resolve(annotation);
				}
			});

			return Promise.all([Promise.resolve(submission), Promise.all(additionalDataPromises)])
		});
}

/**
 * Curates records for all of the new Locuses and Annotations.
 * Performs all of the database additions inside a transaction,
 * and if anything goes wrong, the entire thing is rolled back.
 *
 * Responds with:
 * 201 with empty body on successful add.
 * 400 with text describing problem with request.
 * 500 if something blows up on our end.
 */
function curateGenesAndAnnotations(req, res, next) {
	handleSubmissionOrCurationResponse(res, getSubmissionWithData(req.params.id)
		.then(([curSubmission, curAnnotations]) => {
			// Do first-pass request structure validation
			return Promise.all([curSubmission, curAnnotations, validateSubmissionRequest(req.body)]);
		}).then(([curSubmission, curAnnotations, validationResult]) => {

			// Curation-specific validation
			if (!req.body.annotations.every(a => !!a.status && !!a.id )) {
				return Promise.reject(new ValidationError('All curated annotations need a status and an id'));
			}

			const curAnnotationMap = curAnnotations.reduce((acc, annotation) => {
				acc[annotation.get('id')] = annotation;
				return acc;
			}, {});

			const newAnnotationMap = req.body.annotations.reduce((acc, annotation) => {
				acc[annotation.id] = annotation;
				return acc;
			}, {});
			
			// Validate the request's annotations are a subset of the current ones.
			if (!curAnnotations.every(annotation => annotation.get('id') in newAnnotationMap)) {
					return Promise.reject(new ValidationError('All annotations must be part of this submission'));
			}

			// Validate that the annotation's keywords are not plain-text and are valid.
			if (!req.body.annotations
				.every(newAnnotation => {
					let method = newAnnotation.data.method;
					let keyword = newAnnotation.data.keyword;

					return newAnnotation.status != 'accepted' || 
						(newAnnotation.status == 'accepted' &&
							(!method || (!!method.id && !method.name)) && 
							(!keyword || (!!keyword.id && !keyword.name)));
				})) {
					return Promise.reject(new ValidationError('All keywords have to have valid external ids'));
			}

			req.body.annotations.forEach(newAnnotation => {
				const curAnnotation = curAnnotationMap[newAnnotation.id];
				if (annotationHelper.AnnotationTypeData[newAnnotation.type] ==
					annotationHelper.AnnotationTypeData[curAnnotation.get('type')]) {
					newAnnotation.data.id = curAnnotation.related('childData').get('id');
				}
				// TODO handle deleting the other format?
			});

			// Now that the request is valid, start the update.
			return performSubmissionOrCuration(req, validationResult, curSubmission);
		}));
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
 * limit - Optional. Number of results to fetch. Defaults to / hard capped at PAGE_LIMIT.
 * page - Optional. Page of results to start on. Defaults to 1.
 * sort_by - Optional. Submission value to sort list by.
 *      Options are:
 *          - date - Creation date of submission
 *          - document - Publication name
 *          - annotations - Total number of annotations
 *      Defaults to date.
 * sort_dir - Optional. Direction to sort list by. Defaults to 'DESC'.
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
		itemsPerPage = parseInt(req.query.limit);
	}

	if (!req.query.page || req.query.page <= 1) {
		page = 1;
	} else {
		page = parseInt(req.query.page);
	}

	// Validate sort direction
	if (req.query.sort_dir && req.query.sort_dir !== 'asc' && req.query.sort_dir !== 'desc') {
		return response.badRequest(res, `Invalid sort_dir value '${req.query.sort_dir}'`);
	}

	let countProm = Submission.query(qb => qb.count('* as count')).fetch();
	let groupProm = Submission
		.query(() => {}) // Necessary to chain into fetchPage
		.fetchAll({withRelated: ['publication', 'submitter', 'annotations.status']});

	Promise.all([countProm, groupProm])
		.then(([count, submissionCollection]) => {

			// The query to make SQL sort by publication name or annotation count
			// is annoyingly complicated, so we do it here instead.
			//
			// FIXME: We are aware that this isn't scalable, and it should be offloaded
			// to SQL in the future.
			let sortedSubCollection;
			if (!req.query.sort_by || req.query.sort_by === 'date') {
				sortedSubCollection = submissionCollection.sortBy(elem => {
					let milliseconds = Date.parse(elem.get('created_at'));
					return (!req.query.sort_dir || req.query.sort_dir === 'desc') ? -milliseconds : milliseconds;
				});
			}
			else if (req.query.sort_by === 'annotations') {
				sortedSubCollection = submissionCollection.sortBy(elem => {
					let count = elem.related('annotations').size();
					return (!req.query.sort_dir || req.query.sort_dir === 'desc') ? -count : count;
				});
			}
			else if (req.query.sort_by === 'pending') {
				sortedSubCollection = submissionCollection.sortBy(elem => {
					let pending = elem
						.related('annotations')
						.filter(ann => ann.related('status').get('name') === PENDING_STATUS)
						.length;
					return (!req.query.sort_dir || req.query.sort_dir === 'desc') ? -pending : pending;
				});
			}
			else if (req.query.sort_by === 'document') {
				sortedSubCollection = submissionCollection.toArray().sort((a, b) => {
					let puba = a.related('publication');
					let nameA = puba.get('doi') || puba.get('pubmed_id');

					let pubb = b.related('publication');
					let nameB = pubb.get('doi') || pubb.get('pubmed_id');

					return (!req.query.sort_dir || req.query.sort_dir === 'desc') ? nameB > nameA : nameA > nameB;
				});
			}
			else {
				return response.badRequest(res, `Invalid sort_by value '${req.query.sort_by}'`);
			}

			// Do our own pagination
			//
			// FIXME: Like above, we realize this is the database's job.
			// This should also be addressed with a better query.

			// FIXME: clean up these 3 repetitive sections for each collection

			// In progress submissions
			let sortedInProgressSubCollection = sortedSubCollection.filter(sub => {
				let annotations = sub.related('annotations');
				let pending = annotations.filter(ann => ann.related('status').get('name') === PENDING_STATUS).length;
				let total = annotations.size();

				return (pending > 0 && pending < total);
			});

			// Needs review submissions
			let sortedNeedsReviewSubCollection = sortedSubCollection.filter(sub => {
				let annotations = sub.related('annotations');
				let pending = annotations.filter(ann => ann.related('status').get('name') === PENDING_STATUS).length;
				let total = annotations.size();

				return (pending == total);
			});

			// reviewed submissions
			let sortedReviewedSubCollection = sortedSubCollection.filter(sub => {
				let annotations = sub.related('annotations');
				let pending = annotations.filter(ann => ann.related('status').get('name') === PENDING_STATUS).length;

				return (pending == 0);
			});

			const responseMapping = subCollection => (
				subCollection.slice(
					(page - 1) * itemsPerPage, page * itemsPerPage
				).map(submissionModel => {
					let publication = submissionModel.related('publication');
					let annotations = submissionModel.related('annotations');
					return {
						id: submissionModel.get('id'),
						document: publication.get('doi') || publication.get('pubmed_id'),
						total: annotations.size(),
						pending: annotations.filter(ann => ann.related('status').get('name') === PENDING_STATUS).length,
						submission_date: new Date(submissionModel.get('created_at')).toISOString()
					};
				})
			);

			let finalRes = {
				page: page,
				page_size: itemsPerPage,
				total_pages: Math.ceil(count.get('count') / itemsPerPage),
				sort_by: req.param.sort_by || 'date',
				inProgress: responseMapping(sortedInProgressSubCollection),
				needsReview: responseMapping(sortedNeedsReviewSubCollection),
				reviewed: responseMapping(sortedReviewedSubCollection),
			};

			return response.ok(res, finalRes);
		})
		.catch(err => response.defaultServerError(res, err));
}

/**
 * Gets a single submission with all annotation / gene data.
 *
 * Responses:
 * 200 with submission body
 * 404 if given ID doesn't exist
 * 500 if something goes wrong internally
 */
function getSingleSubmission(req, res, next) {
	getSubmissionWithData(req.params.id)
		.then(([submission, loadedAnnotations]) => {

			let locusList = getAllLociFromAnnotations(loadedAnnotations);
			let annotationList = generateAnnotationSubmissionList(submission.related('annotations'));
			let publication = submission.related('publication').get('doi') || submission.related('publication').get('pubmed_id');

			let submitter = submission.related('submitter');

			let submitterObj = {
				email_address: submitter.get('email_address'),
				name: submitter.get('name'),
				orcid_id: submitter.get('orcid_id')
			};

			let sub = {
				id: submission.get('id'),
				publicationId: publication,
				genes: locusList,
				annotations: annotationList,
				submitter: submitterObj,
				submitted_at: submission.get('created_at')
			};

			return response.ok(res, sub);
		})
		.catch(err => {
			if (err.message.includes('EmptyResponse')) {
				return response.notFound(res, `No submission with ID ${req.params.id}`)
			}

			return response.defaultServerError(res, err)
		});
}

/**
 * Build list of loci for this submission
 */
function getAllLociFromAnnotations(annotationList) {

	// Use a map (from reduce) to prevent duplicate loci in the list.
	let locusMap = annotationList.reduce((list, annotation) => {

		if (!annotation) {
			return list;
		}

		// Use this as a raw object because Bookshelf was having some issue where
		// the Bookshelf model was defined, but no fields on the model were set.
		let ann = annotation.toJSON();

		// All annotations reference a locus
		let locusName = ann.locus.names[0].locus_name;
		let locusSymbol = ann.locusSymbol;
		list[locusName] = {
			id: ann.locus.id,
			locusName: locusName,
			geneSymbol: locusSymbol ? locusSymbol.symbol : null,
			fullName: locusSymbol ? locusSymbol.full_name : null
		};

		// Comment annotations don't have any child data we care about
		if (ann.annotation_format !== 'comment_annotation') {

			if (!_.isEmpty(ann.childData.locus2)) {
				let locus2Name = ann.childData.locus2.names[0].locus_name;
				list[locus2Name] = {
					id: ann.childData.locus2.id,
					locusName: locus2Name
				};

				if (!_.isEmpty(ann.childData.locus2Symbol)) {
					list[locus2Name].geneSymbol = ann.childData.locus2Symbol.symbol;
					list[locus2Name].fullName = ann.childData.locus2Symbol.full_name;
				}
			}
		}

		return list;
	}, {});

	// The list of values is all of the loci in the list of annotations, with no duplicates
	return _.values(locusMap);
}

/**
 * Takes in a list of annotation bookshelf models and outputs the list
 * of annotations formatted as they would appear in a submission.
 */
function generateAnnotationSubmissionList(annotationList) {
	let refinedAnnotations = annotationList.map(annotation => {
		let refinedAnn = {
			id: annotation.get('id'),
			type: annotation.related('type').get('name'),
			status: annotation.related('status').get('name'),
			data: {
				locusName: annotation.related('locus').related('names').first().get('locus_name'),
			}
		};

		// Data changes based on annotation type
		if (annotation.get('annotation_format') === 'gene_term_annotation') {
			refinedAnn.data.method = {
				id: annotation.related('childData').related('method').get('id'),
				name: annotation.related('childData').related('method').get('name'),
				externalId: annotation.related('childData').related('method').get('external_id'),
				evidenceCode: annotation.related('childData').related('method').related('keywordMapping').get('evidence_code'),
				isEvidenceWithOr: annotation.related('childData').get('is_evidence_with_or')
			};

			refinedAnn.data.keyword = {
				id: annotation.related('childData').related('keyword').get('id'),
				name: annotation.related('childData').related('keyword').get('name'),
				externalId: annotation.related('childData').related('keyword').get('external_id')
			};

			if (annotation.related('childData').related('evidenceWith').length > 0) {
				refinedAnn.data.evidenceWith = annotation.related('childData').related('evidenceWith').map(ew => {
					return ew.related('subject').related('names').first().get('locus_name');
				});
			}
		}
		else if (annotation.get('annotation_format') === 'gene_gene_annotation') {
			refinedAnn.data.locusName2 = annotation.related('childData').related('locus2').related('names').first().get('locus_name');
			refinedAnn.data.method = {
				id: annotation.related('childData').related('method').get('id'),
				name: annotation.related('childData').related('method').get('name'),
				externalId: annotation.related('childData').related('method').get('external_id'),
			};
		}
		else { //if (annotation.get('annotation_format') === 'comment_annotation')
			refinedAnn.data.text = annotation.related('childData').get('text');
		}

		return refinedAnn;
	});

	return refinedAnnotations;
}

module.exports = {
	submitGenesAndAnnotations,
	curateGenesAndAnnotations,
	generateSubmissionSummary,
	getSingleSubmission
};
