'use strict';

const bookshelf = require('../lib/bookshelf');

require('./locus');
require('./annotation');

const EvidenceWith = bookshelf.model('EvidenceWith', {
	tableName: 'evidence_with',
	locus: function() {
		return this.belongsTo('Locus', 'locus_id');
	},
    annotation: function() {
        return this.belongsTo('Annotation', 'annotation');
    }
});

module.exports = EvidenceWith;
