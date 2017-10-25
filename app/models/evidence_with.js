'use strict';

const bookshelf = require('../lib/bookshelf');

require('./locus');
require('./gene_term_annotation');

const EvidenceWith = bookshelf.model('EvidenceWith', {
	tableName: 'evidence_with',
	subject_id: function() {
		return this.morphOne('Subject', 'subject_id', ['locus']);
    },
    gene_term_id: function() {
        return this.hasMany('GeneTermAnnotation', 'id');
    },
    addNew: function(params, transaction) {
        return bookshelf.model('EvidenceWith')
            .forge(params)
            .save(null, {transacting: transaction});
    }
});

module.exports = EvidenceWith;
