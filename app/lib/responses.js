'use strict';

const OK = 200;
const CREATED = 201;
const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const NOT_FOUND = 404;
const INTERNAL_SERVER_ERROR = 500;

const logger = require("../services/logger");

function ok(res, object) {
    logger.debug(object);
    return res.status(OK).json(object);
}

function created(res, object) {
    logger.debug(object);
    return res.status(CREATED).json(object);
}

function badRequest(res, message) {
    logger.info(message);
    return res.status(BAD_REQUEST).send(message);
}

function unauthorized(res, message) {
    logger.info(message);
    return res.status(UNAUTHORIZED).send(message);
}

function forbidden(res, message) {
    logger.info(message);
    return res.status(FORBIDDEN).send(message);
}

function notFound(res, message) {
    logger.info(message);
    return res.status(NOT_FOUND).send(message);
}

function serverError(res, message) {
    logger.error(message);
    return res.status(INTERNAL_SERVER_ERROR).send(message);
}

function defaultServerError(res, err) {
    logger.error(err);
    return res.status(INTERNAL_SERVER_ERROR).send('Internal Server Error');
}

module.exports ={
    ok,
    created,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    serverError,
    defaultServerError
};
