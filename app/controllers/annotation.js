"use strict";

const _ = require('lodash');

const publicationValidator = require('../lib/publication_id_validator');

const Publication        = require('../models/publication');
const GeneTermAnnotation = require('../models/gene_term_annotation');
const GeneGeneAnnotation = require('../models/gene_gene_annotation');
const CommentAnnotation  = require('../models/comment_annotation');
const Annotation         = require('../models/annotation');
const User               = require('../models/user');
const AnnotationStatus   = require('../models/annotation_status');
const Keyword            = require('../models/keyword');

const BASE_ALLOWED_FIELDS      = ['publication_id', 'status_id', 'submitter_id', 'locus_id', 'annotation_type'];
const GENE_TERM_ALLOWED_FIELDS = ['method_id', 'keyword_id', 'evidence_id'];
const GENE_GENE_ALLOWED_FIELDS = ['locus2_id', 'method_id'];
const COMMENT_ALLOWED_FIELDS   = ['text'];

/**
 *
 * @param  {Express.request}   req  - the request object
 * @param  {Express.Response}   res  - the response object
 * @param  {Function} next - pass to next route handler
 */
function createAnnotation(req, res, next) {

	let validateRequest;
	let verifyReferentialIntegrity;
	let createSubRecords;

	/* This is a bastardized strategy pattern to change
	 * how we validate / verify annotation creation requests
	 * and add annotation records based on annotation type.
	 */
	if (req.body.annotation_type === 'gene_term_annotation') {
		const validFields = BASE_ALLOWED_FIELDS.concat(GENE_TERM_ALLOWED_FIELDS);
		const optionalFields = ['evidence_id'];

		// TODO evidence_id is required under certain circumstances

		validateRequest = requestValidator.bind(null, req, validFields, optionalFields);
		verifyReferentialIntegrity = geneTermFieldVerifier.bind(null, req);
		createSubRecords = geneTermRecordCreator.bind(null, req);
	}
	else if (req.body.annotation_type === 'gene_gene_annotation') {
		const validFields = BASE_ALLOWED_FIELDS.concat(GENE_GENE_ALLOWED_FIELDS);

		validateRequest = requestValidator.bind(null, req, validFields);
		verifyReferentialIntegrity = geneGeneFieldVerifier.bind(null, req);
		createSubRecords = geneGeneRecordCreator.bind(null, req);
	}
	else if (req.body.annotation_type === 'comment_annotation') {
		const validFields = BASE_ALLOWED_FIELDS.concat(COMMENT_ALLOWED_FIELDS);

		validateRequest = requestValidator.bind(null, req, validFields);
		verifyReferentialIntegrity = commentFieldVerifier.bind(null, req);
		createSubRecords = commentRecordCreator.bind(null, req);
	}
	else if (!req.body.annotation_type) {
		return badRequest(res, 'No annotation_type specified');
	}
	else {
		return badRequest(res, 'Unrecognized annotation_type ' + req.body.annotation_type);
	}


	// Step 1: Ensure no extraneous data was attached to the request
	try {
		validateRequest();
	} catch(e) {
		return badRequest(res, e.message);
	}

	// Step 2: Verify the data
	verifyReferentialIntegrity()
		.then(values => {
			// NOTE: Don't need to check these values since the promise will get rejected if they don't exist

			// Step 3: Insert the data the main annotation is dependent on
			return createSubRecords();
		})
		.then(addedRecords => {
			// Step 4: With dependencies created, now add the Annotation itself
			let addedPublication = addedRecords[0].toJSON();
			let addedSubAnnotation = addedRecords[1].toJSON();

			// The request has most of the annotation info already
			let newAnnotation = _.pick(req.body, BASE_ALLOWED_FIELDS);
			newAnnotation.publication_id = addedPublication.id; // We're overriding the actual publication ID with a reference
			newAnnotation.annotation_id = addedSubAnnotation.id;

			return Annotation.forge(newAnnotation).save();
		})
		.then(addedAnnotation => {
			return res.status(201)
				.json(addedAnnotation);
		})
		.catch(err => {

			if (   err.message.match(/Given publication ID is not a DOI or Pubmed ID/)
				|| err.message.match(/Given .* does not reference an existing record/)) {
				return badRequest(res, err.message);
			}
			else {
				return res.status(500).send('Internal Server Error occurred while adding the annotation');
			}
		});
}

/**
 * Verifies that all required annotation fields were passed in,
 * without any extras.
 *
 * Throws an error for failed validation
 */
function requestValidator(req, validFields, optionalFields) {

	// Look for extra fields
	let extraFields = Object.keys(_.omit(req.body, validFields));
	if (extraFields.length) {
		throw new Error(`Invalid ${req.body.annotation_type} fields: ${extraFields}`);
	}

	// Make sure we have all required fields
	const requiredFields = _.difference(validFields, optionalFields);
	let missingFields = _.difference(requiredFields, Object.keys(req.body));
	if (missingFields.length) {
		throw new Error(`Missing ${req.body.annotation_type} fields: ${missingFields}`);
	}
}

/**
 * The following functions verify the various IDs specified
 * for this annotation creation request actually refer to
 * a real thing.
 *
 * All Bookshelf requests have {require: true} set, which will
 * reject the fetch promise if a record isn't found for the
 * given ID.
 *
 * Any other failed verification is failed with a Promise.reject()
 *
 * While annotations MAY contain new keywords, we expect the client
 * to have created those new Keywords in a separate request.
 *
 * Returns a Promise.
 */
function genericFieldVerifier(req) {
	let verificationPromises = [];

	// Publication ID validation
	if (   !publicationValidator.isDOI(req.body.publication_id)
		&& !publicationValidator.isPubmedId(req.body.publication_id)) {

		// This causes the entire Promise.all chain to reject, which we catch downstream and return as a 400.
		verificationPromises.push(
			Promise.reject(new Error('Given publication ID is not a DOI or Pubmed ID'))
		);
	}

	verificationPromises.push(
		redefineError(
			User.where({id: req.body.submitter_id}).fetch({require: true}),
			'Given submitter_id does not reference an existing record',
			'EmptyResponse'
		)
	);
	verificationPromises.push(
		redefineError(
			AnnotationStatus.where({id: req.body.status_id}).fetch({require: true}),
			'Given status_id does not reference an existing record',
			'EmptyResponse'
		)
	);

	// TODO how are we verifying Locus IDs?
	// TODO If we are, verify locus_id Locus.

	return verificationPromises;
}

function geneTermFieldVerifier(req) {
	let verificationPromises = genericFieldVerifier(req);

	verificationPromises.push(
		redefineError(
			Keyword.where({id: req.body.method_id}).fetch({require: true}),
			'Given method_id does not reference an existing record',
			'EmptyResponse'
		)
	);
	verificationPromises.push(
		redefineError(
			Keyword.where({id: req.body.keyword_id}).fetch({require: true}),
			'Given keyword_id does not reference an existing record',
			'EmptyResponse'
		)
	);

	// TODO if necessary, validate evidence_id Locus

	return Promise.all(verificationPromises);
}

function geneGeneFieldVerifier(req) {
	let verificationPromises = genericFieldVerifier(req);

	verificationPromises.push(
		redefineError(
			Keyword.where({id: req.body.method_id}).fetch({require: true}),
			'Given method_id does not reference an existing record',
			'EmptyResponse'
		)
	);

	// TODO if necessary, validate locus2_id Locus

	return Promise.all(verificationPromises);
}

// Comment Annotations have no additional verification
function commentFieldVerifier(req) {
	let verificationPromises = genericFieldVerifier(req);
	return Promise.all(verificationPromises);
}


/**
 * These functions add the records needed for creating the main Annotation.
 * Currently that includes only the Publication record and
 * specialized Annotation type information.
 *
 * Returns a Promise.
 */
function genericRecordCreator(req) {
	// Publication ID is stored in the field corresponding to its type
	let newPublication = {};
	if (publicationValidator.isDOI(req.body.publication_id)) {
		newPublication.doi = req.body.publication_id;
	} else if (publicationValidator.isPubmedId(req.body.publication_id)) {
		newPublication.pubmed_id = req.body.publication_id;
	}

	// Use an existing publication record if possible
	return Publication.where(newPublication).fetch().then(existingPublication => {
		if (existingPublication) {
			return Promise.resolve(existingPublication);
		} else {
			return Publication.forge(newPublication).save();
		}
	});
}

function geneTermRecordCreator(req) {
	let recordCreationPromises = [];
	recordCreationPromises.push(
		genericRecordCreator(req)
	);

	let newSubAnnotation = _.pick(req.body, GENE_TERM_ALLOWED_FIELDS);
	recordCreationPromises.push(
		GeneTermAnnotation.forge(newSubAnnotation).save()
	);

	return Promise.all(recordCreationPromises);
}

function geneGeneRecordCreator(req) {
	let recordCreationPromises = [];
	recordCreationPromises.push(
		genericRecordCreator(req)
	);

	let newSubAnnotation = _.pick(req.body, GENE_GENE_ALLOWED_FIELDS);
	recordCreationPromises.push(
		GeneGeneAnnotation.forge(newSubAnnotation).save()
	);

	return Promise.all(recordCreationPromises);
}

function commentRecordCreator(req) {
	let recordCreationPromises = [];
	recordCreationPromises.push(
		genericRecordCreator(req)
	);

	let newSubAnnotation = _.pick(req.body, COMMENT_ALLOWED_FIELDS);
	recordCreationPromises.push(
		CommentAnnotation.forge(newSubAnnotation).save()
	);

	return Promise.all(recordCreationPromises);
}

/**
 * The given promise is rejected with the specified message instead of its own message.
 * If a matcher is specified, the rejection message is only replaced if it matches.
 *
 * This is because Bookshelf errors aren't verbose enough.
 * Added the matcher because Bookshelf could fail for reasons other than a record not being found.
 */
function redefineError(promise, message, matcher) {
	return new Promise((resolve, reject) => {
		promise
			.then(result => resolve(result))
			.catch(err => {
				if (matcher) {
					if (err.message.match(matcher)) {
						reject(new Error(message));
					} else {
						reject(err);
					}
				} else {
					reject(new Error(message))
				}
			});
	});
}

function badRequest(res, message) {
	return res.status(400).send(message);
}

module.exports = {
	createAnnotation
};