const Submission = require('../models/submission');
const { AnnotationTypeData } = require('../lib/annotation_submission_helper');
const fs = require('fs');

const PENDING_STATUS = 'pending';
const ACCEPTED_STATUS = 'accepted';

const EXPORTS_ROOT = 'resources/exports';
const HEADER = `!gaf-version: 2.0
!Project_name: The Arabidopsis Information Resource (TAIR)
!URL: http://www.arabidopsis.org
!Contact Email: curator@arabidopsis.org
!Funding: NSF grants DBI-9978564 and DBI-0417062
`;

/**
 * Maps external source data name to helpful data for the export file.
 */
const externalSourceData = {
    'TAIR': {
        db: 'TAIR',
        type: 'gene_product'
    },
    'RNA Central': {
        db: 'RNACentral',
        type: 'RNA'
    },
    'Uniprot': {
        db: 'UniprotKB',
        type: 'protein'
    }
}

/**
 * A simple leading 0 number padding helper function
 * @param {Number} n 
 */
function pad(n){
    return n < 10 ? '0' + n : '' + n;
}

/**
 * Exports all the data in a GAF file format
 */
function exportAllData() {
    // TODO Better date generation
    const date = new Date().toISOString().split("T")[0];
    const filePath = EXPORTS_ROOT + '/' + date + '.gaf';
    console.log(`Starting export file at ${filePath}`);

    // Delete the file if it ran on the same day
    if (fs.existsSync(filePath)) {
        console.log(`File already exists, clearing...`);
        fs.unlinkSync(filePath);
    }

    // Create the file and write the header
    let fileStream = fs.createWriteStream(filePath);
    fileStream.write(HEADER);

    return Submission
        .query(() => {})
        .fetchAll({withRelated: ['publication', 'submitter', 'annotations.status']})
        .then(submissions => {
            console.log(`Got ${submissions.length} total submissions`);

            let sortedSubCollection = submissions.sortBy(elem => {
                // Sort each submission by the date it was created
                let milliseconds = Date.parse(elem.get('created_at'));
                return  -milliseconds;
            }).filter(sub => {
                // Only include submission's who's annotations are all not pending.
                let annotations = sub.related('annotations');
                let pending = annotations.filter(ann => ann.related('status').get('name') === PENDING_STATUS).length;
                return (pending == 0);
            });

            console.log(`Got ${sortedSubCollection.length} completed submissions`);

            // Make a flat array for each annotation
            const annotationsToExport = [];
            sortedSubCollection.map(submission => {
                submission
                    .related('annotations')
                    .filter(ann => ann.related('status').get('name') === ACCEPTED_STATUS)
                    .map(annotation => {
                        if (annotation.get('annotation_format') === 'gene_term_annotation') {
                            // Load all information we'll need about this annotation
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
                                'childData.evidenceSymbol'
                            ]));
                        }
                        // TODO other annotation types
                    })
            });
            return Promise.all(annotationsToExport);
        }).then(annotationsToExport => {

            console.log(`Got ${annotationsToExport.length} accepted annotations to export`);

            /**
             * A helper function that will null check writing a field to the fileStream
             * @param {String|null|undefined} field 
             */
            function writeField(field) {
                if (typeof field !== 'undefined' && field !== null && field !== '') {
                    fileStream.write(field);
                }
                fileStream.write('\t');
            }

            // Loop over each annotation and start writing the entry
            annotationsToExport.map(annotation => {
                if (annotation.get('annotation_format') === 'gene_term_annotation') {

                    // Reused related data
                    const childData = annotation.related('childData');
                    const locusName = annotation.related('locus').related('names').shift();
                    const locusSymbol = annotation.related('locusSymbol');
                    const externalSourceName = locusName.related('source').get('name')
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
                        DBObjectSymbol = locusSymbol.get('symbol')
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
                    // TODO export Evidence With.
                    let EvidenceWith = null;
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
                    DateField += pad(parsedCreation.getMonth());
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

                // TODO other annotation types

                fileStream.write('\n');
            });

            // Close the file and wait for it to be finished before resolving this promise.
            fileStream.end();
            return new Promise((resolve, reject) => {
                fileStream
                    .on('finish', () => {
                        console.log('Sucessfully finished writing the export file');
                        resolve();
                    });
            });
        })
        .catch((error) => {
            // If there was an error, delete the file to avoid incomplete exported files.
            fileStream.end();
            console.log(`Error while creating export, deleting export file...`);
            fs.unlinkSync(filePath);

            // Re-throw the promise so we exit with a status of 1.
            return Promise.reject(error);
        });
}

module.exports = exportAllData;