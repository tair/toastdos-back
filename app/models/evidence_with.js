'use strict';

const bookshelf = require('../lib/bookshelf');

require('./locus');
require('./annotation');

const EvidenceWith = bookshelf.model('EvidenceWith', {
	tableName: 'evidence_with',
	subject_id: function() {
		return this.morphOne('Subject', 'subject_id', ['locus']);
    },
    annotation_id: function() {
        return this.morphOne('Annotation', 'annotation', ['annotation_format','annotation_id']);
    },
    addNew: function(params, transaction) {
        return bookshelf.model('EvidenceWith')
            .forge({
                subject_id: params.subject_id,
                annotation_id: params.annotation_id,
                type: params.type
            })
            .save(null, {transacting: transaction});
    }
});

module.exports = EvidenceWith;
