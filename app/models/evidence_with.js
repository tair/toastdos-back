'use strict';

const bookshelf = require('../lib/bookshelf');

require('./locus');
require('./gene_term_annotation');

const EvidenceWith = bookshelf.model('EvidenceWith', {
	tableName: 'evidence_with',
	subject: function() {
		return this.morphTo('subject', 'Locus');
    }
});

module.exports = EvidenceWith;