'use strict';

const response = require('../lib/responses');

const Annotation = require('../models/annotation');


function getAnnotations(req, res) {
    // let returnStatement = Annotation;
    // let paramList = req.params.searchParamaters.split("%20");
    // paramList.forEach( (element) => {
    //     returnStatement.where('status_id', element).orWhere();
    // });
    return Annotation.where('status_id', 2).where('annotation_id', req.params.searchParameters).fetch({withRelated: ['submitter', 'publication', 'locusSymbol', 'childData']})
    //return returnStatement.where('status_id', 2).fetch()
        .then(annotations => response.ok(res, annotations))
        .catch(err => response.defaultServerError(res, err));
}


module.exports = {
    getAnnotations
}
