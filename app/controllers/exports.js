'use strict';

const response = require('../lib/responses');
const config = require('../../config');
const path = require('path');
const fs = require('fs');

const EXPORTS_PATH = path.join(config.resourceRoot, 'exports');

/**
 * Gets a list of the exports
 *
 * Responses:
 * 200 json description of the exports
 * 500 can't read the exports directory
 */
function list(req, res) {
    fs.readdir(EXPORTS_PATH, function(err, items) {
        if (!err) {
            response.ok(res, items);
        } else {
            response.serverError(res, "Error reading exports directory.");
        }
    });
}


module.exports = {
    list
};