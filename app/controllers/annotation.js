"use strict";

const _ = require('lodash');

const publicationValidator = require('../lib/publication_id_validator');

const Publication        = require('../models/publication');
const GeneTermAnnotation = require('../models/gene_term_annotation');
const GeneGeneAnnotation = require('../models/gene_gene_annotation');
const CommentAnnotation  = require('../models/comment_annotation');
const Annotation         = require('../models/annotation');

/**
 *
 * @param  {Express.request}   req  - the request object
 * @param  {Express.Response}   res  - the response object
 * @param  {Function} next - pass to next route handler
 */
function createAnnotation(req, res, next) {

	// Step 1: Ensure no extraneous data was attached to the request
	const baseAllowedFields     = ['publication_id', 'status_id', 'submitter_id', 'locus_id', 'annotation_type'];
	const geneTermAllowedFields = ['method_id', 'keyword_id', 'evidence_id'];
	const geneGeneAllowedFields = ['locus2_id', 'method_id'];
	const commentAllowedFields  = ['text'];

	let requiredFields;
	if (req.body.annotation_type === 'gene_term_annotation') {
		requiredFields = baseAllowedFields.concat(geneTermAllowedFields);
	}
	else if (req.body.annotation_type === 'gene_gene_annotation') {
		requiredFields = baseAllowedFields.concat(geneGeneAllowedFields);
	}
	else if (req.body.annotation_type === 'comment_annotation') {
		requiredFields = baseAllowedFields.concat(commentAllowedFields);
	}
	else if (!req.body.annotation_type) {
		return res.status(400)
			.json({
				error: 'BadRequest',
				message: 'No Annotation type specified'
			});
	}
	else {
		return res.status(400)
			.json({
				error: 'BadRequest',
				message : 'Unrecognized annotation_type ' + res.body.annotation_type
			});
	}

	let extraFields = Object.keys(_.omit(req.body, requiredFields));
	if (extraFields.length) {
		return res.status(400)
			.json({
				error: 'BadRequest',
				message: 'Invalid Annotation fields: ' + extraFields
			});
	}

	// Step 2: Validate the data
	if (!publicationValidator.isDOI(req.body.publication_id)
		&& !publicationValidator.isPubmedId(req.body.publication_id)) {
		return res.status(400)
			.json({
				error: 'BadRequest',
				message: 'Given publication ID is not a DOI or Pubmed ID'
			});
	}

	// TODO currently we only have DOI/Pubmed ID validation. Come back to this later

	// TODO evidence_id is required for GeneTermAnnotations under certain circumstances

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
	Promise.all([publicationPromise, subAnnotationPromise])
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

module.exports = {
	createAnnotation
};
