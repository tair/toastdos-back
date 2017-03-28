'use strict';

const OK = 200;
const CREATED = 201;
const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;
const NOT_FOUND = 404;
const INTERNAL_SERVER_ERROR = 500;

const testing = (process.env.NODE_ENV === 'test');

const logger = require("../../config/logger");

function ok(res, object) {
	return res.status(OK).json(object);
}

function created(res, object) {
	return res.status(CREATED).json(object);
}

function badRequest(res, message) {
	if (!testing) console.error(message);
	return res.status(BAD_REQUEST).send(message);
}

function unauthorized(res, message) {
	if (!testing) console.error(message);
	return res.status(UNAUTHORIZED).send(message);
}

function notFound(res, message) {
	if (!testing) console.error(message);
	return res.status(NOT_FOUND).send(message);
}

function serverError(res, message) {
	if (!testing) console.error(message);
	return res.status(INTERNAL_SERVER_ERROR).send(message);
}

function defaultServerError(res, err) {
	if (!testing) console.error(err);
	return res.status(INTERNAL_SERVER_ERROR).send('Internal Server Error');
}

module.exports ={
	ok,
	created,
	badRequest,
	unauthorized,
	notFound,
	serverError,
	defaultServerError
};
