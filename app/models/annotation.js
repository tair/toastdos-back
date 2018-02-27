'use strict';

const bookshelf = require('../lib/bookshelf');

require('./publication');
require('./annotation_status');
require('./annotation_type');
require('./submission');
require('./user');
require('./keyword');
require('./locus');
require('./gene_symbol');
require('./gene_term_annotation');
require('./gene_gene_annotation');
require('./comment_annotation');

const Annotation = bookshelf.model('Annotation', {
    tableName: 'annotation',
    status: function() {
        return this.belongsTo('AnnotationStatus', 'status_id');
    },
    type: function() {
        return this.belongsTo('AnnotationType', 'type_id');
    },
    publication: function() {
        return this.belongsTo('Publication', 'publication_id');
    },
    submission: function() {
        return this.belongsTo('Submission', 'submission_id');
    },
    submitter: function() {
        return this.belongsTo('User', 'submitter_id');
    },
    locus: function() {
        return this.belongsTo('Locus', 'locus_id');
    },
    locusSymbol: function() {
        return this.belongsTo('GeneSymbol', 'locus_symbol_id');
    },
    childData: function() {
        return this.morphTo('annotation', ['annotation_format', 'annotation_id'], 'GeneTermAnnotation', 'GeneGeneAnnotation', 'CommentAnnotation');
    }
});

module.exports = Annotation;
