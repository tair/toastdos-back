'use strict';

const _ = require('lodash');

const publicationValidator = require('../lib/publication_id_validator');
const response             = require('../lib/responses');

const Publication        = require('../models/publication');
const GeneTermAnnotation = require('../models/gene_term_annotation');
const GeneGeneAnnotation = require('../models/gene_gene_annotation');
const CommentAnnotation  = require('../models/comment_annotation');
const Annotation         = require('../models/annotation');
const User               = require('../models/user');
const AnnotationStatus   = require('../models/annotation_status');
const Keyword            = require('../models/keyword');


const BASE_ALLOWED_FIELDS = ['publication_id', 'status_id', 'submitter_id', 'locus_id', 'annotation_type'];

/* This is a bastardized strategy pattern to change
 * how we validate / verify annotation creation requests
 * and add annotation records based on annotation format.
 */
const AnnotationFormats = {
	GENE_TERM: {
		name: 'gene_term_annotation',
		fields: BASE_ALLOWED_FIELDS.concat(['method_id', 'keyword_id', 'evidence_id']),
		optionalFields: ['evidence_id'],
		referenceCheck: geneTermFieldVerifier,
		createRecords: geneTermRecordCreator
	},
	GENE_GENE: {
		name: 'gene_gene_annotation',
		fields: BASE_ALLOWED_FIELDS.concat(['locus2_id', 'method_id']),
		referenceCheck: geneGeneFieldVerifier,
		createRecords: geneGeneRecordCreator
	},
	COMMENT: {
		name: 'comment_annotation',
		fields: BASE_ALLOWED_FIELDS.concat(['text']),
		referenceCheck: commentFieldVerifier,
		createRecords: commentRecordCreator
	}
};

const AnnotationTypeData = {
	MOLECULAR_FUNCTION: {
		name: "Molecular Function",
		format: AnnotationFormats.GENE_TERM,
		keywordScope: "molecular_function"
	},
	BIOLOGICAL_PROCESS: {
		name: "Biological Process",
		format: AnnotationFormats.GENE_TERM,
		keywordScope: "biological_process"
	},
	SUBCELLULAR_LOCATION: {
		name: "Subcellular Location",
		format: AnnotationFormats.GENE_TERM,
		keywordScope: "cellular_component"
	},
	ANATOMICAL_LOCATION: {
		name: "Anatomical Location",
		format: AnnotationFormats.GENE_TERM,
		keywordScope: "plant_anatomy"
	},
	TEMPORAL_EXPRESSION: {
		name: "Temporal Expression",
		format: AnnotationFormats.GENE_TERM,
		keywordScope: "plant_structure_development_stage"
	},
	PROTEIN_INTERACTION: {
		name: "Protein Interaction",
		format: AnnotationFormats.GENE_GENE
	},
	COMMENT: {
		name: "Comment",
		format: AnnotationFormats.COMMENT
	}
};

/*
{
	"type": "TEMPORAL_EXPRESSION",
	"data": {
		"gene": "My First Gene",
		"keyword": "some keyword",
		"method": "some method"
	}
}
*/

// FIXME locusMap - an optimization to help looking up genes used in an annotation
function addAnnotationRecords(annotation, locusMap, transaction) {

	let strategy = AnnotationTypeData[annotation.type];


	// Step 1: Ensure no extraneous data was attached to the request
	// Step 2: Verify the data
	// Step 3: Insert the data the main annotation is dependent on
	// Step 4: With dependencies created, now add the Annotation itself

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

module.exports = {
	addAnnotationRecords
};
