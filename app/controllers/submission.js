'use strict';

const bookshelf            = require('../lib/bookshelf');
const response             = require('../lib/responses');
const locusHelper          = require('../lib/locus_submission_helper');
const annotationHelper     = require('../lib/annotation_submission_helper');
const publicationValidator = require('../lib/publication_id_validator');

const Publication = require('../models/publication');

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

	// Perform the whole addition in a transaction so we can rollback if something goes horribly wrong.
	bookshelf.transaction(transaction => {

		// Use an existing publication record if possible
		let publicationPromise = Publication.where({[publicationType]: req.body.publicationId})
			.fetch({transacting: transaction})
			.then(existingPublication => {
				if (existingPublication) {
					return Promise.resolve(existingPublication);
				} else {
					return Publication.forge({[publicationType]: req.body.publicationId})
						.save({transacting: transaction});
				}
			});

		let locusPromises = req.body.genes.map(gene => {
			return locusHelper.addLocusRecords(gene.locusName, gene.fullName, gene.geneSymbol,
				req.user.attributes.id, transaction);
		});

		// Isolate the publication promise from the locus promises
		return Promise.all([publicationPromise, Promise.all(locusPromises)])
			.then(([publication, locusArray]) => {

				// Create a map of the locuses we added so we can quickly look them up by name
				let locusMap = locusArray.map(locus => ({[locus.related('locus').attributes.id]: locus}))
					.reduce((accumulator, curValue) => Object.assign(accumulator, curValue));

				let annotationPromises = req.body.annotations.map(annotation => {
					// Every Annotation needs a reference to Publication and User ID
					annotation.internalPublicationId = publication.attributes.id;
					annotation.submitterId = req.user.attributes.id;

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
			response.defaultServerError(res, err);
		});
}

module.exports = {
	submitGenesAndAnnotations
};
