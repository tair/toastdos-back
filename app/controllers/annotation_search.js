'use strict';

const response = require('../lib/responses');

const Annotation = require('../models/annotation');

/**
 * Gets the list of all annotation statuses in our system then searches through it for specific annoations.
 * It does this based on a string entered by the user.
 * It can search for publication id, submitter, taxonomy, method, keyword, evidence, or locus.
 * Responses:
 * 200 with list of matching annotations
 * 500 on internal error
 */
function getAnnotations(req, res) {
    Annotation.fetchAll({withRelated:
            ['submitter', 'status', 'publication', 'locus.taxon', 'locus.names', 'locusSymbol', 'childData.keyword',
                'childData.method', 'childData.evidence', 'childData.locus2Symbol', 'childData.locus2',
                'childData.locus2.taxon','childData.locus2.names', 'childData.keyword.keywordType', 'childData.method.keywordMapping']})
        .then(function(annotations) {
            let paramList = [];
            let resultList = new Map();

            /*
            * This block of code parses the search sent from the front end.
            * It steps through the search line one index at a time.
            * Whenever it encounters a space, it takes the segment of the search from that
            *   space before and adds it to a search list.
            *   Whenever it encounters a quote, single or double, it waits until the next quote to add to the list.
             */
            let searchParameters = req.params.searchParameters;
            let index = 0;
            let isQuoted = false;
            for (let x = 0; x <= searchParameters.length; x++) {
                if (searchParameters.charAt(x) === " " && !isQuoted) {
                    paramList.push(searchParameters.substring(index, x));
                    index = x+1;
                }
                else if (searchParameters.charAt(x) === '"' || searchParameters.charAt(x) === "'") {
                    if (isQuoted) {
                        isQuoted = false;
                        paramList.push(searchParameters.substring(index+1, x));
                        index = x+2;
                        x+=1;
                    }
                    else if (!isQuoted) {
                        isQuoted = true;
                    }
                }
                else if (x === searchParameters.length) {
                    paramList.push(searchParameters.substring(index, x));
                }
            }

            annotations.forEach( function(annotation) {
                annotation = JSON.parse(JSON.stringify(annotation));
                
                if (annotation.status.id === 2) {
                    let pubmed;
                    let submitter;
                    let taxon;
                    let locusSymbol;
                    let locusName;
                    let methodName;
                    let methodID;
                    let keywordName;
                    let keywordID;
                    let evidenceName;
                    let locusTwoName;
                    let locusTwoSymbol;
                    if (annotation.publication) {
                        pubmed = annotation.publication.pubmed_id;
                    }
                    if (annotation.submitter) {
                        submitter = annotation.submitter.name.toLowerCase();
                    }
                    if (annotation.locus.taxon) {
                        taxon = annotation.locus.taxon.name.toLowerCase();
                    }
                    if (annotation.locusSymbol) {
                        locusSymbol = annotation.locusSymbol.symbol.toLowerCase();
                        locusName = annotation.locusSymbol.full_name.toLowerCase();
                    }
                    if (annotation.childData.method) {
                        methodName = annotation.childData.method.name.toLowerCase();
                        methodID = annotation.childData.method.external_id.toLowerCase();
                    }
                    if (annotation.childData.keyword) {
                        keywordName = annotation.childData.keyword.name.toLowerCase();
                        keywordID = annotation.childData.keyword.external_id.toLowerCase();
                    }
                    if (annotation.childData.evidence) {
                        evidenceName = annotation.childData.evidence.name.toLowerCase();
                    }
                    if (annotation.childData.locus2Symbol) {
                        locusTwoSymbol = annotation.childData.locus2Symbol.symbol.toLowerCase();
                        locusTwoName = annotation.childData.locus2Symbol.full_name.toLowerCase();
                    }

                    paramList.forEach(function (searchElement) {
                        searchElement = searchElement.toString().replace(/['"]+/g, '').toLowerCase();

                        if (searchElement) {
                            if (pubmed && pubmed.includes(searchElement)) {
                                if (!resultList.has(annotation.id)) {
                                    resultList.set(annotation.id, annotation);
                                }
                            } else if (submitter && submitter.includes(searchElement)) {
                                if (!resultList.has(annotation.id)) {
                                    resultList.set(annotation.id, annotation);
                                }
                            } else if (taxon && taxon.includes(searchElement)) {
                                if (!resultList.has(annotation.id)) {
                                    resultList.set(annotation.id, annotation);
                                }
                            } else if (methodName && methodName.includes(searchElement)) {
                                if (!resultList.has(annotation.id)) {
                                    resultList.set(annotation.id, annotation);
                                }
                            } else if (methodID && methodID.includes(searchElement)) {
                                if (!resultList.has(annotation.id)) {
                                    resultList.set(annotation.id, annotation);
                                }
                            } else if (keywordName && keywordName.includes(searchElement)) {
                                if (!resultList.has(annotation.id)) {
                                    resultList.set(annotation.id, annotation);
                                }
                            } else if (keywordID && keywordID.includes(searchElement)) {
                                if (!resultList.has(annotation.id)) {
                                    resultList.set(annotation.id, annotation);
                                }
                            } else if (evidenceName && evidenceName.includes(searchElement)) {
                                if (!resultList.has(annotation.id)) {
                                    resultList.set(annotation.id, annotation);
                                }
                            } else if (locusSymbol && locusSymbol.includes(searchElement)) {
                                if (!resultList.has(annotation.id)) {
                                    resultList.set(annotation.id, annotation);
                                }
                            } else if (locusName && locusName.includes(searchElement)) {
                                if (!resultList.has(annotation.id)) {
                                    resultList.set(annotation.id, annotation);
                                }
                            } else if (locusTwoSymbol && locusTwoSymbol.includes(searchElement)) {
                                if (!resultList.has(annotation.id)) {
                                    resultList.set(annotation.id, annotation);
                                }
                            } else if (locusTwoName && locusTwoName.includes(searchElement)) {
                                if (!resultList.has(annotation.id)) {
                                    resultList.set(annotation.id, annotation);
                                }
                            }
                        }
                    })
                }
            });

            return response.ok(res, Array.from(resultList.values()));
        })
        .catch(err => response.defaultServerError(res, err));
}

module.exports = {
    getAnnotations
}
