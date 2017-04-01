'use strict';

const bookshelf = require('../lib/bookshelf');

require('./user');
require('./publication');

const Submission = bookshelf.model('Submission', {
	tableName: 'submission',
	submitter: function() {
		return this.belongsTo('User', 'user_id');
	},
	publication: function() {
		return this.belongsTo('Publication', 'publication_id');
	}
});

module.exports = Submission;
