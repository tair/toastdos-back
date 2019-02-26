'use strict';

const response = require('../lib/responses');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

const Annotation = require('../models/annotation');
const {
    AnnotationTypeData
} = require('../lib/annotation_submission_helper');

const EXPORTS_ROOT = path.join(config.resourceRoot, 'exports');
const date = new Date().toISOString().split("T")[0];
const HEADER = `!gaf-version: 2.0
!Project_name: The Arabidopsis Information Resource (TAIR)
!URL: http://www.arabidopsis.org
!Contact Email: curator@arabidopsis.org
!Last Updated: ` + date + `\n`;


/**
 * Maps external source data name to helpful data for the export file.
 */
const externalSourceData = {
    'TAIR': {
        db: 'TAIR',
        prefix: 'AGI_LocusCode',
        type: 'gene_product'
    },
    'RNA Central': {
        db: 'RNACentral',
        prefix: 'RNACentral',
        type: 'RNA'
    },
    'Uniprot': {
        db: 'UniprotKB',
        prefix: 'UniProtKB',
        type: 'protein'
    }
};

/**
 * A simple leading 0 number padding helper function
 * @param {Number} n
 */
function pad(n) {
    return n < 10 ? '0' + n : '' + n;
}


function getFile(req, res) {
    /**
     * TODO: Figure a way to dynamically create a file and have the client download it so no saving
     * TODO: of the temporary search export file needs to be done on the server
     */

    /**
     * A helper function that will generate a random name for the file to be saved
     */
    function makeID() {
        let text = "";
        let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (let i = 0; i < 10; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }

    const fileName = makeID()+'.gaf';
    const filePath = EXPORTS_ROOT + '/' + fileName;

    // Create the file and write the header
    let fileStream = fs.createWriteStream(filePath);
    fileStream.write(HEADER);

    let paramList = [];
    let queryParameters = req.params.annotationParameters;

    let index = 0;
    for (let x = 0; x <= queryParameters.length; x++) {
        if (queryParameters.charAt(x) === "," || x === queryParameters.length) {
            paramList.push(queryParameters.substring(index, x));
            index = x+1;
        }
    }

    Annotation.query(qb => {
        qb.whereIn('id', paramList);
    }).fetchAll({withRelated:
        ['submitter',
            'publication',
            'type',
            'locusSymbol',
            'locus',
            'locus.taxon',
            'locus.names',
            'locus.names.source',
            'childData.method',
            'childData.method.keywordMapping',
            'childData.keyword',
            'childData.evidence.names',
            'childData.evidenceSymbol',
            'childData.evidenceWith',
            'childData.evidenceWith.subject.names',
            'childData.evidenceWith.subject.names.source',
            'childData.locus2.names',
            'childData.locus2Symbol',
            'childData.locus2.names.source',
            'childData.locus2.taxon',
            'childData.locus2']})
        .then(annotations => {
            let sortedAnnotations = annotations.sortBy(elem => {
                let milliseconds = Date.parse(elem.get('created_at'));
                return -milliseconds;
            });

            const annotationsToExport = [];
            sortedAnnotations.map(annotation => {
                if (annotation.get('annotation_format') === 'gene_term_annotation') {
                    annotationsToExport.push(annotation.load([
                        'submitter',
                        'publication',
                        'type',
                        'locusSymbol',
                        'locus',
                        'locus.taxon',
                        'locus.names',
                        'locus.names.source',
                        'childData.method',
                        'childData.method.keywordMapping',
                        'childData.keyword',
                        'childData.evidence.names',
                        'childData.evidenceSymbol',
                        'childData.evidenceWith',
                        'childData.evidenceWith.subject.names',
                        'childData.evidenceWith.subject.names.source'
                    ]));
                }
                else if (annotation.get('annotation_format') === 'gene_gene_annotation') {
                    annotationsToExport.push(annotation.load([
                        'submitter',
                        'publication',
                        'type',
                        'locusSymbol',
                        'locus',
                        'locus.taxon',
                        'locus.names',
                        'locus.names.source',
                        'childData.method',
                        'childData.locus2.names',
                        'childData.locus2Symbol',
                        'childData.locus2.names.source',
                        'childData.locus2.taxon',
                        'childData.locus2'
                    ]));
                }
            });
            return Promise.all(annotationsToExport);
        }).then(annotationsToExport => {
            /**
             * A helper function that will null check writing a field to the fileStream
             * @param {String|null|undefined} field
             */
            function writeField(field) {
                console.log(field);
                if (typeof field !== 'undefined' && field !== null && field !== '') {
                    fileStream.write(field);
                }
                fileStream.write('\t');
            }

            /**
             * A helper function that will generate the valid evidence with
             * identifier for LocusName db object.
             * @param {LocusName} locusName
             */
            function getEvidenceWithFieldFromLocusName(locusName) {
                let locusNameText = locusName.get('locus_name');
                let sourceName = locusName.related('source').get('name');
                return externalSourceData[sourceName].prefix + ":" + locusNameText;
            }

            annotationsToExport.map(annotation => {
                if (annotation.get('annotation_format') === 'gene_term_annotation') {
                    // Reused related data
                    const childData = annotation.related('childData');
                    const locusName = annotation.related('locus').related('names').shift();
                    const locusSymbol = annotation.related('locusSymbol');
                    const externalSourceName = locusName.related('source').get('name');
                    const sourceData = externalSourceData[externalSourceName];
                    if (!sourceData) {
                        throw new Error('No Source Data for source name: ' + externalSourceName);
                    }

                    // 1. The DB field
                    let DB = sourceData.db;
                    writeField(DB);

                    // 2. DB Object ID
                    let DBObjectID = locusName.get('locus_name');
                    writeField(DBObjectID);

                    // 3. DB Object Symbol
                    let DBObjectSymbol;
                    if (locusSymbol && locusSymbol.get('symbol')) {
                        DBObjectSymbol = locusSymbol.get('symbol');
                    } else {
                        DBObjectSymbol = DBObjectID;
                    }
                    writeField(DBObjectSymbol);

                    // 4. Qualifier (skip)
                    let Qualifier = null;
                    writeField(Qualifier);

                    // 5. GO ID (Keyword external id)
                    let GOID = childData.related('keyword').get('external_id');
                    writeField(GOID);

                    // 6. DB Reference
                    let DBReference;
                    let publication = annotation.related('publication');
                    if (publication.get('pubmed_id')) {
                        DBReference = 'PMID:' + publication.get('pubmed_id');
                    } else if (publication.get('doi')) {
                        DBReference = 'DOI:' + publication.get('doi');
                    } else {
                        throw new Error("No publication reference id set");
                    }
                    writeField(DBReference);

                    // 7. Evidence Code
                    let EvidenceCode = childData.related('method').related('keywordMapping').get('evidence_code');
                    writeField(EvidenceCode);

                    // 8. Evidence With
                    let EvidenceWithSeparator = childData.get('is_evidence_with_or') ? '|' : ',';
                    let EvidenceWith = childData.related('evidenceWith')
                        .map(ew => ew.related('subject').related('names').first())
                        .map(getEvidenceWithFieldFromLocusName)
                        .join(EvidenceWithSeparator);
                    writeField(EvidenceWith);

                    // 9. Aspect
                    let Aspect = AnnotationTypeData[annotation.related('type').get('name')].aspect;
                    writeField(Aspect);

                    //10. DB Object Name
                    let DBObjectName = '';
                    if (locusSymbol && locusSymbol.get('full_name')) {
                        DBObjectName = locusSymbol.get('full_name');
                    }
                    writeField(DBObjectName);

                    //11. DB Object Synonym (skip)
                    let DBObjectSynonym = null;
                    writeField(DBObjectSynonym);

                    //12. DB Object Type
                    let DBObjectType = sourceData.type;
                    writeField(DBObjectType);

                    //13. Taxon(|taxon)
                    let Taxon = 'taxon:' + annotation.related('locus').related('taxon').get('taxon_id');
                    writeField(Taxon);

                    //14. Date
                    let DateField = '';
                    let parsedCreation = new Date(annotation.get('created_at'));
                    DateField += parsedCreation.getFullYear();
                    DateField += pad(parsedCreation.getMonth() + 1);
                    DateField += pad(parsedCreation.getDate());
                    writeField(DateField);

                    //15. Assigned By
                    let AssignedBy = 'ORCID:' + annotation.related('submitter').get('orcid_id');
                    writeField(AssignedBy);

                    //16. Annotation Extension
                    let AnnotationExtension = null;
                    writeField(AnnotationExtension);

                    //17. Gene Product Form ID
                    let GeneProductFormID = null;
                    writeField(GeneProductFormID);
                }
                else if (annotation.get('annotation_format') === 'gene_gene_annotation') {

                    // Reused related data
                    const childData = annotation.related('childData');
                    const locusName = annotation.related('locus').related('names').shift();
                    const locusSymbol = annotation.related('locusSymbol');
                    const externalSourceName = locusName.related('source').get('name');
                    const sourceData = externalSourceData[externalSourceName];
                    if (!sourceData) {
                        throw new Error('No Source Data for source name: ' + externalSourceName);
                    }

                    const locus2Name = childData.related('locus2').related('names').shift();
                    const locus2Symbol = childData.related('locus2Symbol');
                    const externalSource2Name = locus2Name.related('source').get('name');
                    const source2Data = externalSourceData[externalSource2Name];
                    if (!source2Data) {
                        throw new Error('No Source Data for source name: ' + externalSource2Name);
                    }

                    //Data for first locus with second locus as evidence
                    // 1. The DB field
                    let DB = sourceData.db;
                    writeField(DB);

                    // 2. DB Object ID
                    let DBObjectID = locusName.get('locus_name');
                    writeField(DBObjectID);

                    // 3. DB Object Symbol
                    let DBObjectSymbol;
                    if (locusSymbol && locusSymbol.get('symbol')) {
                        DBObjectSymbol = locusSymbol.get('symbol');
                    } else {
                        DBObjectSymbol = DBObjectID;
                    }
                    writeField(DBObjectSymbol);

                    // 4. Qualifier (skip)
                    let Qualifier = null;
                    writeField(Qualifier);

                    // 5. GO ID (Keyword external id)
                    let GOID = 'GO:0005515';
                    writeField(GOID);

                    // 6. DB Reference
                    let DBReference;
                    let publication = annotation.related('publication');
                    if (publication.get('pubmed_id')) {
                        DBReference = 'PMID:' + publication.get('pubmed_id');
                    } else if (publication.get('doi')) {
                        DBReference = 'DOI:' + publication.get('doi');
                    } else {
                        throw new Error("No publication reference id set");
                    }
                    writeField(DBReference);

                    // 7. Evidence Code
                    let EvidenceCode = 'IPI';
                    writeField(EvidenceCode);

                    // 8. Evidence With
                    let EvidenceWith = getEvidenceWithFieldFromLocusName(locus2Name);
                    writeField(EvidenceWith);

                    // 9. Aspect
                    let Aspect = 'F';
                    writeField(Aspect);

                    //10. DB Object Name
                    let DBObjectName = '';
                    if (locusSymbol && locusSymbol.get('full_name')) {
                        DBObjectName = locusSymbol.get('full_name');
                    }
                    writeField(DBObjectName);

                    //11. DB Object Synonym (skip)
                    let DBObjectSynonym = null;
                    writeField(DBObjectSynonym);

                    //12. DB Object Type
                    let DBObjectType = sourceData.type;
                    writeField(DBObjectType);

                    //13. Taxon(|taxon)
                    let Taxon = 'taxon:' + annotation.related('locus').related('taxon').get('taxon_id');
                    writeField(Taxon);

                    //14. Date
                    let DateField = '';
                    let parsedCreation = new Date(annotation.get('created_at'));
                    DateField += parsedCreation.getFullYear();
                    DateField += pad(parsedCreation.getMonth() + 1);
                    DateField += pad(parsedCreation.getDate());
                    writeField(DateField);

                    //15. Assigned By
                    let AssignedBy = 'ORCID:' + annotation.related('submitter').get('orcid_id');
                    writeField(AssignedBy);

                    //16. Annotation Extension
                    let AnnotationExtension = null;
                    writeField(AnnotationExtension);

                    //17. Gene Product Form ID
                    let GeneProductFormID = null;
                    writeField(GeneProductFormID);

                    fileStream.write('\n');

                    //Data for second locus with first as evidence

                    // 1. The DB field
                    DB = source2Data.db;
                    writeField(DB);

                    // 2. DB Object ID
                    DBObjectID = locus2Name.get('locus_name');
                    writeField(DBObjectID);

                    // 3. DB Object Symbol
                    DBObjectSymbol;
                    if (locus2Symbol && locus2Symbol.get('symbol')) {
                        DBObjectSymbol = locus2Symbol.get('symbol');
                    } else {
                        DBObjectSymbol = DBObjectID;
                    }
                    writeField(DBObjectSymbol);

                    // 4. Qualifier (skip)
                    Qualifier = null;
                    writeField(Qualifier);

                    // 5. GO ID (Keyword external id)
                    GOID = 'GO:0005515';
                    writeField(GOID);

                    // 6. DB Reference
                    DBReference;
                    publication = annotation.related('publication');
                    if (publication.get('pubmed_id')) {
                        DBReference = 'PMID:' + publication.get('pubmed_id');
                    } else if (publication.get('doi')) {
                        DBReference = 'DOI:' + publication.get('doi');
                    } else {
                        throw new Error("No publication reference id set");
                    }
                    writeField(DBReference);

                    // 7. Evidence Code
                    EvidenceCode = 'IPI';
                    writeField(EvidenceCode);

                    // 8. Evidence With
                    EvidenceWith = getEvidenceWithFieldFromLocusName(locusName);
                    writeField(EvidenceWith);

                    // 9. Aspect
                    Aspect = 'F';
                    writeField(Aspect);

                    //10. DB Object Name
                    DBObjectName = '';
                    if (locus2Symbol && locus2Symbol.get('full_name')) {
                        DBObjectName = locus2Symbol.get('full_name');
                    }
                    writeField(DBObjectName);

                    //11. DB Object Synonym (skip)
                    DBObjectSynonym = null;
                    writeField(DBObjectSynonym);

                    //12. DB Object Type
                    DBObjectType = sourceData.type;
                    writeField(DBObjectType);

                    //13. Taxon(|taxon)
                    Taxon = 'taxon:' + childData.related('locus2').related('taxon').get('taxon_id');
                    writeField(Taxon);

                    //14. Date
                    DateField = '';
                    parsedCreation = new Date(annotation.get('created_at'));
                    DateField += parsedCreation.getFullYear();
                    DateField += pad(parsedCreation.getMonth() + 1);
                    DateField += pad(parsedCreation.getDate());
                    writeField(DateField);

                    //15. Assigned By
                    AssignedBy = 'ORCID:' + annotation.related('submitter').get('orcid_id');
                    writeField(AssignedBy);

                    //16. Annotation Extension
                    AnnotationExtension = null;
                    writeField(AnnotationExtension);

                    //17. Gene Product Form ID
                    GeneProductFormID = null;
                    writeField(GeneProductFormID);
                }

                fileStream.write('\n');
            });

            // Close the file and wait for it to be finished before resolving this promise.

            let p = new Promise((resolve) => {
                fileStream
                    .on('finish', () => {
                        resolve();
                    });
            });
            fileStream.end();
            return response.ok(res, fileName);
        })
        .catch((error) => {
            // If there was an error, delete the file to avoid incomplete exported files.
            fileStream.end();
            fs.unlinkSync(filePath);

            // Re-throw the promise so we exit with a status of 1.
            return response.defaultServerError(res, error)
        });
}

module.exports = {
    getFile
};