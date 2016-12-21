"use strict";

const _ = require('lodash');


/**
 *
 * @param  {Express.request}   req  - the request object
 * @param  {Express.Response}   res  - the response object
 * @param  {Function} next - pass to next route handler
 */
function createAnnotation(req, res, next) {

	// Step 1: Ensure no extraneous data was attached to the request
	const baseAllowedFields     = ['publication_id', 'status_id', 'submitter_id', 'locus_id', 'type'];
	const geneTermAllowedFields = ['method_id', 'keyword_id', 'evidence_id'];
	const geneGeneAllowedFields = ['locus2_id', 'method_id'];
	const commentAllowedFields  = ['text'];

	let requiredFields;
	if (req.body.type === 'gene_term_annotation') {
		requiredFields = baseAllowedFields.concat(geneTermAllowedFields);
	}
	else if (req.body.type === 'gene_gene_annotation') {
		requiredFields = baseAllowedFields.concat(geneGeneAllowedFields);
	}
	else if (req.body.type === 'comment_annotation') {
		requiredFields = baseAllowedFields.concat(commentAllowedFields);
	}
	else if (!req.body.type) {
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
				message : 'Unrecognized type ' + res.body.type
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



}

module.exports = {
	createAnnotation
};
