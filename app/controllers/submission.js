'use strict';

const bookshelf            = require('../lib/bookshelf');
const response             = require('../lib/responses');
const locusHelper          = require('../lib/locus_submission_helper');
const annotationHelper     = require('../lib/annotation_submission_helper');
const publicationValidator = require('../lib/publication_id_validator');

const Publication = require('../models/publication');

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


	// Publication ID validation / type detection
	let publicationType;
	if (publicationValidator.isDOI(req.body.publicationId)) {
		publicationType = 'doi';
	} else if (publicationValidator.isPubmedId(req.body.publicationId)) {
		publicationType = 'pubmed_id';
	} else {
		return response.badRequest(res, `${req.body.publicationID} is not a DOI or Pubmed ID`);
	}

	// We bundle submitter ID in with the submission request, but it needs to match the authenticated user
	if (req.user.attributes.id !== req.body.submitterId) {
		return response.unauthorized(res, 'submitterId does not match authenticated user');
	}

	// TODO Transaction here

	// Use an existing publication record if possible
	let publicationPromise = Publication.where({[publicationType]: req.body.publicationId})
		.fetch()
		.then(existingPublication => {
			if (existingPublication) {
				return Promise.resolve(existingPublication);
			} else {
				return Publication.forge({[publicationType]: req.body.publicationId}).save();
			}
		});

	let locusPromises = req.body.genes.map(
		gene => locusHelper.addLocusRecords(gene.locusName, gene.fullName, gene.geneSymbol)
	);

	// Isolate the publication promise from the locus promises
	Promise.all([publicationPromise, Promise.all(locusPromises)])
		.then(([publication, locusArray]) => {

			// Create a map of the locuses we added so we can quickly look them up by name
			let locusMap = locusArray.map(locus => ({[locus.related('locus').attributes.id]: locus}))
				.reduce((accumulator, curValue) => Object.assign(accumulator, curValue));

			let annotationPromises = req.body.annotations.map(annotation => {
				// Every Annotation needs a reference to Publication and User ID
				annotation.internalPublicationId = publication.attributes.id;
				annotation.submitterId = req.user.attributes.id;

				return annotationHelper.addAnnotationRecords(annotation, locusMap);
			});

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
