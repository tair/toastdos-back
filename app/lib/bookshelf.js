'use strict';

const knex = require('./db');

let Bookshelf = require('bookshelf')(knex);

Bookshelf.plugin('registry');
Bookshelf.plugin('pagination');

module.exports = Bookshelf;