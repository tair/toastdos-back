'use strict';

const bookshelf = require('../lib/bookshelf');

require('./annotation');

const Publication = bookshelf.model('Publication', {
	tableName: 'publication',
	referencedBy: function() {
		return this.hasMany('Annotation', 'publication_id');
	}
}, {
	addOrGet: function(params, transaction) {
		let query = {};
		if (params.doi) query.doi = params.doi;
		if (params.pubmed_id) query.pubmed_id = params.pubmed_id;

		return bookshelf.model('Publication')
			.where(query)
			.fetch({transacting: transaction})
			.then(existingPublication => {
				if (existingPublication) {
					return Promise.resolve(existingPublication);
				} else {
					return bookshelf.model('Publication')
						.forge(query)
						.save(null, {transacting: transaction});
				}
			});
	}
});

module.exports = Publication;
