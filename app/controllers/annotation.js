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

	let requestValidator;

	if (req.body.annotation_type === 'gene_term_annotation') {
		const validFields = BASE_ALLOWED_FIELDS.concat(GENE_TERM_ALLOWED_FIELDS);
		const optionalFields = ['evidence_id'];
		requestValidator = validateRequest.bind(null, req, validFields, optionalFields);
	}
	else if (req.body.annotation_type === 'gene_gene_annotation') {
		const validFields = BASE_ALLOWED_FIELDS.concat(GENE_GENE_ALLOWED_FIELDS);
		requestValidator = validateRequest.bind(null, req, validFields);
	}
	else if (req.body.annotation_type === 'comment_annotation') {
		const validFields = BASE_ALLOWED_FIELDS.concat(COMMENT_ALLOWED_FIELDS);
		requestValidator = validateRequest.bind(null, req, validFields);
	}
	else if (!req.body.annotation_type) {
		return badRequest(res, 'No Annotation type specified');
	}
	else {
		return badRequest(res, 'Unrecognized annotation_type ' + res.body.annotation_type);
	}


	// Step 1: Ensure no extraneous data was attached to the request
	try {
		requestValidator();
	} catch(e) {
		return badRequest(res, e.message);
	}


	// Step 2: Validate / verify the data
	let validationPromises = [];

	// Publication ID validation
	if (   !publicationValidator.isDOI(req.body.publication_id)
		&& !publicationValidator.isPubmedId(req.body.publication_id)) {
		return badRequest(res, 'Given publication ID is not a DOI or Pubmed ID');
	}

	// Verify the given user actually exists
	if (!req.body.submitter_id) {
		return badRequest(res, 'submitter_id is required');
	}
	validationPromises.push(User.where({id: req.body.submitter_id}));

	// Verify given Annotation status
	if (!req.body.status_id) {
		return badRequest(res, 'status_id is required');
	}
	validationPromises.push(AnnotationStatus.where({id: req.body.status_id}));

	// Verify GeneTerm fields
	if (req.body.annotation_type === 'gene_term_annotation') {

		// Validate given method exists
		if (!req.body.method_id) {
			return badRequest(res, 'method_id is required for gene_term_annotations');
		}
		validationPromises.push(Keyword.where({id: req.body.method_id}));

		// Validate given keyword exists
		if (!req.body.keyword_id) {
			return badRequest(res, 'keyword_id id required for gene_term_annotations');
		}
		validationPromises.push(Keyword.where({id: req.body.keyword_id}));
	}

	// Verify GeneGene fields
	if (req.body.annotation_type === 'gene_gene_annotation') {

		// Validate given method exists
		if (!req.body.method_id) {
			return badRequest(res, 'method_id is required for gene_gene_annotations');
		}
		validationPromises.push(Keyword.where({id: req.body.method_id}));
	}

	// Validate Comment fields
	if (req.body.annotation_type === 'comment_annotation') {

		// Verify the comment annotation has some text
		if (!req.body.text) {
			return badRequest(res, 'text is required for comment_annotations');
		}

	}

	// TODO how are we verifying Locus IDs?
	// TODO If we are, verify locus_id, GeneTerm evidence_id and GeneGene locus2_id
	// TODO evidence_id is required for GeneTermAnnotations under certain circumstances

	Promise.all(validationPromises)
		.then(values => {
			// TODO check these

			// Step 3: Insert the data

			// Identify publication type and add new publication
			let newPublication;
			if (publicationValidator.isDOI(req.body.publication_id)) {
				newPublication = {doi: req.body.publication_id};
			} else if (publicationValidator.isPubmedId(req.body.publication_id)) {
				newPublication = {pubmed_id: req.body.publication_id};
			}
			let publicationPromise = Publication.forge(newPublication).save();

			// Identify sub-Annotation type and add record
			let subAnnotationPromise;
			if (req.body.annotation_type === 'gene_term_annotation') {
				let newSubAnnotation = _.pick(req.body, geneTermAllowedFields);
				subAnnotationPromise = GeneTermAnnotation.forge(newSubAnnotation).save();
			}
			else if (req.body.annotation_type === 'gene_gene_annotation') {
				let newSubAnnotation = _.pick(req.body, geneGeneAllowedFields);
				subAnnotationPromise = GeneGeneAnnotation.forge(newSubAnnotation).save();
			}
			else if (req.body.annotation_type === 'comment_annotation') {
				let newSubAnnotation = _.pick(req.body, commentAllowedFields);
				subAnnotationPromise = CommentAnnotation.forge(newSubAnnotation).save();
			}

			// With dependencies created, now add the Annotation itself
			return Promise.all([publicationPromise, subAnnotationPromise])
		})
		.then(addedRows => {
			let addedPublication = addedRows[0].toJSON();
			let addedSubAnnotation = addedRows[1].toJSON();

			let newAnnotation = _.pick(req.body, baseAllowedFields);
			newAnnotation.publication_id = addedPublication.id; // We're overriding the actual publication ID with a reference
			newAnnotation.annotation_id = addedSubAnnotation.id;

			return Annotation.forge(newAnnotation).save();
		})
		.then(addedAnnotation => {
			return res.status(201)
				.json(addedAnnotation);
		})
		.catch(err => {
			res.status(500)
				.json({
					error: 'DatabaseError',
					message: 'Server had an issue adding the annotation'
				});
		});
}

/**
 * Verifies that all required annotation fields were passed in,
 * without any extras.
 *
 * Throws an error for failed validation
 */
function validateRequest(req, validFields, optionalFields) {

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

function badRequest(res, message) {
	return res.status(400).json({
		error: 'BadRequest',
		message: message
	});
}

module.exports = {
	createAnnotation
};
