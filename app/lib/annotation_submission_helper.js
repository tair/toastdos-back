'use strict';

const _ = require('lodash');

const GeneTermAnnotation = require('../models/gene_term_annotation');
const GeneGeneAnnotation = require('../models/gene_gene_annotation');
const CommentAnnotation  = require('../models/comment_annotation');
const Annotation         = require('../models/annotation');
const AnnotationStatus   = require('../models/annotation_status');
const AnnotationType     = require('../models/annotation_type');
const Keyword            = require('../models/keyword');
const EvidenceWith       = require('../models/evidence_with');

const knex        = require('../lib/bookshelf').knex;
const locusHelper = require('../lib/locus_submission_helper.js');

const BASE_ALLOWED_FIELDS = ['internalPublicationId', 'submitterId', 'locusName'];

/* This is a bastardized strategy pattern to change
 * how we validate / verify annotation creation requests
 * and add annotation records based on annotation format.
 */
const AnnotationFormats = {
	GENE_TERM: {
		name: 'gene_term_annotation',
		fields: BASE_ALLOWED_FIELDS.concat(['method', 'keyword', 'evidence_with']),
		optionalFields: ['evidence_with'],
		verifyReferences: verifyGeneTermFields,
		createRecords: createGeneTermRecords
	},
	GENE_GENE: {
		name: 'gene_gene_annotation',
		fields: BASE_ALLOWED_FIELDS.concat(['locusName2', 'method']),
		verifyReferences: verifyGeneGeneFields,
		createRecords: createGeneGeneRecords
	},
	COMMENT: {
		name: 'comment_annotation',
		fields: BASE_ALLOWED_FIELDS.concat(['text']),
		verifyReferences: verifyCommentFields,
		createRecords: createCommentRecords
	}
};

const AnnotationTypeData = {
	MOLECULAR_FUNCTION: {
		name: 'Molecular Function',
		format: AnnotationFormats.GENE_TERM,
		keywordScope: 'molecular_function'
	},
	BIOLOGICAL_PROCESS: {
		name: 'Biological Process',
		format: AnnotationFormats.GENE_TERM,
		keywordScope: 'biological_process'
	},
	SUBCELLULAR_LOCATION: {
		name: 'Subcellular Location',
		format: AnnotationFormats.GENE_TERM,
		keywordScope: 'cellular_component'
	},
	ANATOMICAL_LOCATION: {
		name: 'Anatomical Location',
		format: AnnotationFormats.GENE_TERM,
		keywordScope: 'plant_anatomy'
	},
	TEMPORAL_EXPRESSION: {
		name: 'Temporal Expression',
		format: AnnotationFormats.GENE_TERM,
		keywordScope: 'plant_structure_development_stage'
	},
	PROTEIN_INTERACTION: {
		name: 'Protein Interaction',
		format: AnnotationFormats.GENE_GENE
	},
	COMMENT: {
		name: 'Comment',
		format: AnnotationFormats.COMMENT
	}
};

const NEW_ANNOTATION_STATUS = 'pending';


/**
 * Creates all of the records necessary for the given annotation.
 *
 * @param annotation - type and data for a single annotation submission
 * @param locusMap - an optimization to help looking up genes used in an annotation
 * @params submission - the submission this annotation is being added for
 * @param transaction - optional transaction for adding these records
 * @return {Promise.<*>}
 */
function addAnnotationRecords(annotation, locusMap, submission, transaction) {
	let strategy = AnnotationTypeData[annotation.type];

	// Step 1: Ensure annotation request all required fields and nothing extra
	try {
		validateFields(annotation, strategy.format.fields, strategy.format.optionalFields);
	} catch (err) {
		return Promise.reject(err);
	}

	// Step 2: Verify the data
	return strategy.format.verifyReferences(annotation, locusMap, transaction)
		// Step 3: Create sub-annotation
		.then(() => strategy.format.createRecords(annotation, locusMap, transaction))
		// Step 4: With dependencies created, now add the Annotation itself
		.then(subAnnotation => {

			// We need the status and type IDs
			return Promise.all([
				AnnotationType.where({name: annotation.type}).fetch({require: true, transacting: transaction}),
				AnnotationStatus.where({name: NEW_ANNOTATION_STATUS}).fetch({require: true, transacting: transaction})
			]).then(([type, status]) => {
				let newAnn = {
					submission_id: submission.get('id'),
					publication_id: annotation.data.internalPublicationId,
					status_id: status.attributes.id,
					type_id: type.attributes.id,
					submitter_id: annotation.data.submitterId,
					locus_id: locusMap[annotation.data.locusName].locus.get('locus_id'),
					annotation_id: subAnnotation.attributes.id,
					annotation_format: strategy.format.name
				};

				// GeneSymbols are optional
				if (locusMap[annotation.data.locusName].symbol) {
					newAnn.locus_symbol_id = locusMap[annotation.data.locusName].symbol.get('id');
				}

				return Annotation.forge(newAnn).save(null, {transacting: transaction});
			});
		});
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

	// Make sure keyword fields have an ID (new keywords will have a name field too. This is ok.)
	let method = annotation.data.method;
	if (method && !method.id) {
		throw new Error('id xor name required for Keywords');
	}

	let keyword = annotation.data.keyword;
	if (keyword && !keyword.id) {
		throw new Error('id xor name required for Keywords');
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
		verificationPromises.push(
			Promise.reject(new Error(`Locus ${annotation.data.locusName} not present in submission`))
		);
	}

	return verificationPromises;
}

function verifyGeneTermFields(annotation, locusMap, transaction) {
	let verificationPromises = verifyGenericFields(annotation, locusMap);

	// Verify method Keywords exist
	verificationPromises.push(
		redefinePromiseError({
			promise: Keyword.where({id: annotation.data.method.id}).fetch({require: true, transacting: transaction}),
			message: `Method id ${annotation.data.method.id} does not reference an existing Keyword`,
			pattern: 'EmptyResponse'
		})
	);

	// Verify keyword Keywords exist
	verificationPromises.push(
		redefinePromiseError({
			promise: Keyword.where({id: annotation.data.keyword.id}).fetch({require: true, transacting: transaction}),
			message: `Keyword id ${annotation.data.keyword.id} does not reference an existing Keyword`,
			pattern: 'EmptyResponse'
		})
	);

	// Evidence Locus is optional, but needs to exist if specified
    const evidence_with = annotation.data.evidence_with;
    for(subject_name of evidence_with) {
    	if (subject_name && !locusMap[subject_name]) {
    	    locusHelper.addLocusRecords({name: subject_name});
        }
    }

	return Promise.all(verificationPromises);
}

function verifyGeneGeneFields(annotation, locusMap, transaction) {
	let verificationPromises = verifyGenericFields(annotation, locusMap);

	// Verify method Keywords exist
	verificationPromises.push(
		redefinePromiseError({
			promise: Keyword.where({id: annotation.data.method.id}).fetch({require: true, transacting: transaction}),
			message: `Method id ${annotation.data.method.id} does not reference an existing Keyword`,
			pattern: 'EmptyResponse'
		})
	);

	// Verify locus2 Locus
	if (!locusMap[annotation.data.locusName2]) {
		verificationPromises.push(
			Promise.reject(new Error(`Locus ${annotation.data.locusName2} not present in submission`))
		);
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
 * Currently that includes only the specialized Annotation type information.
 *
 * Returns a Promise that resolves to new sub-annotation.
 */
function createGeneTermRecords(annotation, locusMap, transaction) {
	let subAnnotation = {
		method_id: annotation.data.method.id,
		keyword_id: annotation.data.keyword.id,
	};

	// add evidence_with to db if exists
    let subject_id;
    for(const subject of annotation.data.evidence_with) {
    	subject_id = locusMap[annotation.data.evidence_with].locus.get('locus_id');
        
    }

	return GeneTermAnnotation.forge(subAnnotation).save(null, {transacting: transaction});
}

function createGeneGeneRecords(annotation, locusMap, transaction) {
	let newGGAnn = {
		method_id: annotation.data.method.id,
		locus2_id: locusMap[annotation.data.locusName2].locus.get('locus_id')
	};

	// GeneSymbols are optional
	if (locusMap[annotation.data.locusName2].symbol) {
		newGGAnn.locus2_symbol_id = locusMap[annotation.data.locusName2].symbol.get('id');
	}

	return GeneGeneAnnotation.forge(newGGAnn).save(null, {transacting: transaction});
}

function createCommentRecords(annotation, locusMap, transaction) {
	// locusMap unused, but needed to keep function signature consistent
	return CommentAnnotation.forge({text: annotation.data.text}).save(null, {transacting: transaction});
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
	addAnnotationRecords,
	AnnotationTypeData
};
