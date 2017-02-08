'use strict';

const bookshelf = require('../lib/bookshelf');

require('./taxon');

const Locus = bookshelf.model('Locus', {
	tableName: 'locus',
	taxon: function() {
		return this.belongsTo('Taxon', 'taxon_id');
	}
});

module.exports = Locus;
