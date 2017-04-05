'use strict';

const bookshelf = require('../lib/bookshelf');

require('./user');
require('./publication');

const Submission = bookshelf.model('Submission', {
	tableName: 'submission',
	submitter: function() {
		return this.belongsTo('User', 'submitter_id');
	},
	publication: function() {
		return this.belongsTo('Publication', 'publication_id');
	}
}, {
	addNew: function(params, transaction) {
		return bookshelf.model('Submission')
			.forge({
				submitter_id:  params.submitter_id,
				publication_id: params.publication_id
			})
			.save(null, {transacting: transaction});
	}
});

module.exports = Submission;
