'use strict';

const bookshelf            = require('../lib/bookshelf');
const response             = require('../lib/responses');
const locusHelper          = require('../lib/locus_submission_helper');
const annotationHelper     = require('../lib/annotation_submission_helper');
const publicationValidator = require('../lib/publication_id_validator');

/**
 *
 *
 * @param req
 * @param res
 * @param next
 */
function submitGenesAndAnnotations(req, res, next) {

	// Ensure we actually provided a list of genes and annotations
	if (!req.body.genes || req.body.genes.length === 0) {
		return response.badRequest(res, 'No genes specified');
	}

	if (!req.body.annotations || req.body.annotations.length === 0) {
		return response.badRequest(res, 'No annotations specified');
	}

	// Ensure the top level fields for each element all exist
	if (req.body.genes.some(gene => (!gene.locusName || !gene.geneSymbol || !gene.fullName) )) {
		return response.badRequest(res, 'Body contained malformed Gene data');
	}

	if (req.body.annotations.some(ann => (!ann.type || !ann.data) )) {
		return response.badRequest(res, 'Body contained malformed Annotation data');
	}


	// Publication ID validation
	if (   !publicationValidator.isDOI(req.body.publicationId)
		&& !publicationValidator.isPubmedId(req.body.publicationId)) {
		return response.badRequest(res, `${req.body.publicationID} is not a DOI or Pubmed ID`);
	}

	// We bundle submitter ID in with the submission request, but it needs to match the authenticated user
	if (req.user.attributes.id !== req.body.submitterId) {
		return response.unauthorized(res, 'submitterId does not match authenticated user');
	}

	// TODO Transaction here

	Promise.all(req.body.genes.map(
			gene => locusHelper.addLocusRecords(gene.locusName, gene.fullName, gene.geneSymbol)
		))
		.then(locusArray => {
			let locusMap = locusArray.map(locus => ({[locus.related('locus'.attributes.id)] : locus}))
				.reduce((accumulator, curValue) => Object.assign(accumulator, curValue));

			let annotationPromises = req.body.annotations.map(
				annotation => annotationHelper.addAnnotationRecords(annotation, locusMap)
			);

			return Promise.all(annotationPromises);
		})
		.then(annotationArray => {
			// We don't actually do anything with the added annotations
			// TODO commit transaction here
			response.created(res);
		})
		.catch(err => {
			// TODO reject transaction here
			response.defaultServerError(res, err);
		});
}

module.exports = {
	submitGenesAndAnnotations
};
