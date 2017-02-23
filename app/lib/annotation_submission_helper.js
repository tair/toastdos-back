'use strict';

const _ = require('lodash');

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
		verifyReferences: verifyGeneTermFields,
		createRecords: geneTermRecordCreator
	},
	GENE_GENE: {
		name: 'gene_gene_annotation',
		fields: BASE_ALLOWED_FIELDS.concat(['locus2_id', 'method_id']),
		verifyReferences: verifyGeneGeneFields,
		createRecords: geneGeneRecordCreator
	},
	COMMENT: {
		name: 'comment_annotation',
		fields: BASE_ALLOWED_FIELDS.concat(['text']),
		verifyReferences: verifyCommentFields,
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


/**
 * TODO description
 *
 * @param annotation - type and data for a single annotation submission
 * @param locusMap - an optimization to help looking up genes used in an annotation
 * @param transaction - optional transaction for adding these records
 * @return {Promise.<*>}
 */
function addAnnotationRecords(annotation, locusMap, transaction) {

	let strategy = AnnotationTypeData[annotation.type];

	// Step 1: Ensure annotation request all required fields and nothing extra
	if (!strategy) {
		return Promise.reject(new Error(`Invalid annotation type ${annotation.type}`));
	}

	try {
		validateFields(annotation, strategy.format.fields, strategy.format.optionalFields);
	} catch (err) {
		return Promise.reject(err);
	}

	// Step 2: Verify the data
	return strategy.format.verifyReferences(annotation)

	// Step 3: Insert the data the main annotation is dependent on
	// Step 4: With dependencies created, now add the Annotation itself

}

/**
 * Validates that all required annotation fields were passed in,
 * without any extras.
 *
 * Throws an error for failed validation
 */
function validateFields(annotation, validFields, optionalFields) {

	// Look for extra fields
	let extraFields = Object.keys(_.omit(annotation.data, validFields));
	if (extraFields.length) {
		throw new Error(`Invalid ${annotation.type} fields: ${extraFields}`);
	}

	// Make sure we have all required fields
	const requiredFields = _.difference(validFields, optionalFields);
	let missingFields = _.difference(requiredFields, Object.keys(annotation.data));
	if (missingFields.length) {
		throw new Error(`Missing ${annotation.type} fields: ${missingFields}`);
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
 * Any non-bookshelf failed verifications are done via Promise.reject()
 *
 * Returns a Promise.
 */
function verifyGenericFields(annotation, locusMap) {
	let verificationPromises = [];

	// Any locus present in our map has already been validated / added to our system
	if (!locusMap[annotation.data.locusName]) {
		verificationPromises.push(Promise.reject(`Locus ${annotation.data.locusName} not present in submission`));
	}

	return verificationPromises;
}

function verifyGeneTermFields(annotation, locusMap) {
	let verificationPromises = verifyGenericFields(annotation, locusMap);

	// A new method Keyword can be created with an Annotation, so we just verify existing ones
	if (annotation.data.method.id) {
		verificationPromises.push(
			redefinePromiseError({
				promise: Keyword.where({id: annotation.data.method.id}).fetch({require: true}),
				message: `Method id ${annotation.data.method.id} does not reference an existing Keyword`,
				pattern: 'EmptyResponse'
			})
		);
	}

	// A new keyword Keyword can be created with an Annotation, so we just verify existing ones
	if (annotation.data.keyword.id) {
		verificationPromises.push(
			redefinePromiseError({
				promise: Keyword.where({id: annotation.data.keyword.id}).fetch({require: true}),
				message: `Keyword id ${annotation.data.keyword.id} does not reference an existing Keyword`,
				pattern: 'EmptyResponse'
			})
		);
	}

	// Evidence Locus is optional
	if (annotation.data.evidence && !locusMap[annotation.data.evidence]) {
		verificationPromises.push(Promise.reject(`Locus ${annotation.data.evidence} not present in submission`));
	}


	return Promise.all(verificationPromises);
}

function verifyGeneGeneFields(annotation, locusMap) {
	let verificationPromises = verifyGenericFields(annotation, locusMap);

	// A new method Keyword can be created with an Annotation, so we just verify existing ones
	if (annotation.data.method.id) {
		verificationPromises.push(
			redefinePromiseError({
				promise: Keyword.where({id: annotation.data.method.id}).fetch({require: true}),
				message: `Method id ${annotation.data.method.id} does not reference an existing Keyword`,
				pattern: 'EmptyResponse'
			})
		);
	}

	// Verify locus2 Locus
	if (!locusMap[annotation.data.locusName2]) {
		verificationPromises.push(Promise.reject(`Locus ${annotation.data.evidence} not present in submission`));
	}


	return Promise.all(verificationPromises);
}

// Comment Annotations have no additional verification
function verifyCommentFields(annotation, locusMap) {
	let verificationPromises = verifyGenericFields(annotation, locusMap);
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
function redefinePromiseError(params) {
	return new Promise((resolve, reject) => {
		params.promise
			.then(result => resolve(result))
			.catch(err => {
				if (params.pattern) {
					if (err.message.match(params.pattern)) {
						reject(new Error(params.message));
					} else {
						reject(err);
					}
				} else {
					reject(new Error(params.message))
				}
			});
	});
}

module.exports = {
	addAnnotationRecords
};
