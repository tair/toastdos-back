'use strict';

const bookshelf = require('../lib/bookshelf');

require('./locus');

const Taxon = bookshelf.model('Taxon', {
	tableName: 'taxon',
	locuses: function() {
		return this.hasMany('Locus', 'taxon_id')
	}
});

module.exports = Taxon;
