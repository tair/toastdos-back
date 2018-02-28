'use strict';

const bookshelf = require('../lib/bookshelf');

require('./user');
require('./publication');
require('./annotation');

const Submission = bookshelf.model('Submission', {
    tableName: 'submission',
    submitter: function() {
        return this.belongsTo('User', 'submitter_id');
    },
    publication: function() {
        return this.belongsTo('Publication', 'publication_id');
    },
    annotations: function() {
        return this.hasMany('Annotation', 'submission_id');
    }
}, {
    addNew: function(params, transaction) {
        let newSub = {
            submitter_id:  params.submitter_id,
            publication_id: params.publication_id
        };

        if (params.created_at) newSub.created_at = params.created_at;

        return bookshelf.model('Submission')
			.forge(newSub)
			.save(null, {transacting: transaction});
    }
});

module.exports = Submission;
