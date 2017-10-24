'use strict';

function enableCORS(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    return next();
}

function allowHeaders(req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    return  next();
}

function allowMethods(req, res, next) {
    //TODO: REMOVE console.log
    if(req.body) console.log(JSON.stringify(req.body, null, 2));

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    return next();
}

module.exports = {
    enableCORS,
    allowHeaders,
    allowMethods
};
