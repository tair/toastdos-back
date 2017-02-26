'use strict';

const _ = require('lodash');

const GeneTermAnnotation = require('../models/gene_term_annotation');
const GeneGeneAnnotation = require('../models/gene_gene_annotation');
const CommentAnnotation  = require('../models/comment_annotation');
const Annotation         = require('../models/annotation');
const AnnotationStatus   = require('../models/annotation_status');
const Keyword            = require('../models/keyword');
const KeywordType        = require('../models/keyword_type');


const BASE_ALLOWED_FIELDS = ['internalPublicationId', 'submitterId', 'locusName'];

/* This is a bastardized strategy pattern to change
 * how we validate / verify annotation creation requests
 * and add annotation records based on annotation format.
 */
const AnnotationFormats = {
	GENE_TERM: {
		name: 'gene_term_annotation',
		fields: BASE_ALLOWED_FIELDS.concat(['method', 'keyword', 'evidence']),
		optionalFields: ['evidence'],
		verifyReferences: verifyGeneTermFields,
		createRecords: createGeneTermRecords
	},
	GENE_GENE: {
		name: 'gene_gene_annotation',
		fields: BASE_ALLOWED_FIELDS.concat(['locusName2', 'method']),
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

// There are very few keyword types, so we cache them.
const METHOD_KEYWORD_TYPE_NAME = 'eco';
let KEYWORD_TYPES = {};


/**
 * Creates all of the records necessary for the given annotation.
 *
 * @param annotation - type and data for a single annotation submission
 * @param locusMap - an optimization to help looking up genes used in an annotation
 * @param transaction - optional transaction for adding these records
 * @return {Promise.<*>}
 */
function addAnnotationRecords(annotation, locusMap, transaction) {
	let strategy = AnnotationTypeData[annotation.type];

	if (!strategy) {
		return Promise.reject(new Error(`Invalid annotation type ${annotation.type}`));
	}

	// Step 1: Ensure annotation request all required fields and nothing extra
	try {
		validateFields(annotation, strategy.format.fields, strategy.format.optionalFields);
	} catch (err) {
		return Promise.reject(err);
	}

	// Step 2: Verify the data
	return strategy.format.verifyReferences(annotation, locusMap)
		// Step 3: Create sub-annotation and any new Keywords
		.then(() => strategy.format.createRecords(annotation, locusMap, strategy.keywordScope, transaction))
		// Step 4: With dependencies created, now add the Annotation itself
		.then(subAnnotation => {
			return Annotation.forge({
				publication_id: annotation.internalPublicationId,
				status_id: null,
				submitter_id: annotation.submitterId,
				locus_id: locusMap[annotation.data.locusName].attributes.id,
				annotation_id: subAnnotation.attributes.id,
				annotation_type: strategy.format.name
			}).save(null, null, null, {transacting: transaction});
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

	// Make sure keyword fields have a name or an ID
	let method = annotation.data.method;
	if (method && !((method.id && !method.name) || (!method.id && method.name)) ) {
		throw new Error('id xor name required for Keywords');
	}

	let keyword = annotation.data.keyword;
	if (keyword && !((keyword.id && !keyword.name) || (!keyword.id && keyword.name)) ) {
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
		verificationPromises.push(
			Promise.reject(new Error(`Locus ${annotation.data.evidence} not present in submission`))
		);
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
 * Adds a new Keyword.
 * Returned promise resolves to the raw ID of the added Keyword.
 * This is to stay consistent with the case where we already have
 * the ID (for annotation record creation).
 *
 * @return {Promise.<TResult>}
 */
function createKeywordRecord(keywordName, keywordTypeName, transaction) {
	let keywordTypePromise;

	// Retrieve the KeywordType id (either via query or our cache)
	if (KEYWORD_TYPES[keywordTypeName]) {
		keywordTypePromise = Promise.resolve(KEYWORD_TYPES[keywordTypeName]);
	} else {
		keywordTypePromise = KeywordType.where({name: keywordTypeName}).fetch();
	}

	return keywordTypePromise.then(keywordType => {
		// Cache this for subsequent requests
		if (!KEYWORD_TYPES[keywordTypeName]) KEYWORD_TYPES[keywordTypeName] = keywordType;

		return Keyword.forge({
			name: keywordName,
			keyword_type_id: keywordType.attributes.id
		}).save(null, null, null, {transacting: transaction});
	}).then(addedKeyword => Promise.resolve(addedKeyword.attributes.id));
}

/**
 * These functions add the records needed for creating the main Annotation.
 * Currently that includes only the specialized Annotation type information
 * and any newly created Keywords.
 *
 * Returns a Promise that resolves to new sub-annotation.
 */
function createGeneTermRecords(annotation, locusMap, keywordScope, transaction) {

	// I'm sorry for this. This kind of nonsense is the only way to handle adding
	// new Keywords without duplicating big chunks of code.
	let methodPromise;
	if (!annotation.data.method.id) {
		methodPromise = createKeywordRecord(annotation.data.method.name, METHOD_KEYWORD_TYPE_NAME, transaction);
	} else {
		methodPromise = Promise.resolve(annotation.data.method.id);
	}

	let keywordPromise;
	if (!annotation.data.keyword.id) {
		keywordPromise = createKeywordRecord(annotation.data.keyword.name, keywordScope, transaction);
	} else {
		keywordPromise = Promise.resolve(annotation.data.keyword.id);
	}

	return Promise.all([methodPromise, keywordPromise])
		.then(([methodId, keywordId]) => {
			return GeneTermAnnotation.forge({
				method_id: methodId,
				keyword_id: keywordId,
				evidence_id: locusMap[annotation.data.evidence].attributes.id
			}).save(null, null, null, {transacting: transaction});
		});
}

function geneGeneRecordCreator(annotation, locusMap, transaction) {
	let methodPromise;
	if (!annotation.data.method.id) {
		methodPromise = createKeywordRecord(annotation.data.method.name, METHOD_KEYWORD_TYPE_NAME, transaction);
	} else {
		methodPromise = Promise.resolve(annotation.data.method.id);
	}

	return methodPromise.then(methodId => {
		return GeneGeneAnnotation.forge({
			method_id: methodId,
			locus2_id: locusMap[annotation.data.locusName2].attributes.id
		}).save(null, null, null, {transacting: transaction});
	});
}

function commentRecordCreator(annotation, transaction) {
	return CommentAnnotation.forge({text: annotation.data.text}).save(null, null, null, {transacting: transaction});
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
