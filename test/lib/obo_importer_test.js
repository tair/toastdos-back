'use strict';

const fs = require('fs');
const chai = require('chai');
chai.use(require('chai-subset'));

const testdata = require('../../seeds/test/test_data.json');

const knex = require('../../app/lib/bookshelf').knex;
const oboImporter = require('../../app/services/obo_importer/obo_importer');

const KeywordType = require('../../app/models/keyword_type');
const Keyword = require('../../app/models/keyword');
const Synonym = require('../../app/models/synonym');
const GeneTermAnnotation = require('../../app/models/gene_term_annotation');
const GeneGeneAnnotation = require('../../app/models/gene_gene_annotation');

describe('OBO Data Importer', function() {

    before('Run the data import script on a test file to populate the database', function() {
        return knex.migrate.latest()
            .then(() => oboImporter.loadOboIntoDB('./test/lib/test_terms.obo'))
            .then(() => oboImporter.loadOboIntoDB('./test/lib/test_terms.obo'));
        // Do it twice to ensure no duplicates
    });

    it('KeywordTypes added from basic term', function() {
        return KeywordType.where({
            name: 'basic_keyword_type'
        })
            .fetch()
            .then(keywordType => chai.expect(keywordType).to.exist);
    });

    it('Keyword added from basic term', function() {
        return Keyword.where({
            external_id: 'GO:0000001'
        })
            .fetch()
            .then(keyword => chai.expect(keyword).to.exist);
    });

    it('Synonyms added from basic term', function() {
        return Synonym.where({
            name: 'a synonym'
        })
            .fetch()
            .then(synonym => chai.expect(synonym).to.exist);
    });

    it('Duplicate KeywordTypes not added', function() {
        return KeywordType.where({
            name: 'basic_keyword_type'
        })
            .fetchAll()
            .then(keywordTypes => chai.expect(keywordTypes).to.have.lengthOf(1));
    });

    it('Duplicate Keyword not added', function() {
        return Keyword.where({
            external_id: 'GO:0000001'
        })
            .fetchAll()
            .then(keywords => chai.expect(keywords).to.have.lengthOf(1));
    });

    it('Duplicate Synonym not added', function() {
        return Synonym.where({
            name: 'a synonym'
        })
            .fetchAll()
            .then(synonyms => chai.expect(synonyms).to.have.lengthOf(1));
    });

    it('Long synonym names are truncated', function() {
        // 252 characters plus an ellipsis
        const truncatedName = 'This is a really long synonym that\'s too big for ' +
            'the database, so the name will be truncated to something smaller than ' +
            'this. That\'s it, really. The rest of this description is just redundant, ' +
            'verbose nonsense to hit the character limit for truncation, ...';

        return Synonym.where('name', 'LIKE', '%really long synonym%').fetch().then(synonym => {
            chai.expect(synonym.get('name')).to.equal(truncatedName);
            chai.expect(synonym.get('name')).to.have.lengthOf(255);
        });
    });

    it('Keyword with no KeywordType uses default KeywordType', function() {
        return Keyword.where({
            external_id: 'GO:0000002'
        })
            .fetch({
                withRelated: 'keywordType'
            })
            .then(keyword => chai.expect(keyword.related('keywordType').get('name')).to.equal('default_keyword_type'));
    });

    it('Keyword with KeywordType overrides default KeywordType', function() {
        return Keyword.where({
            external_id: 'GO:0000003'
        })
            .fetch({
                withRelated: 'keywordType'
            })
            .then(keyword => chai.expect(keyword.related('keywordType').get('name')).to.equal('overide_keyword_type'));
    });

    it('Multiple Keywords can share Synonym names', function() {
        return Synonym.where({
            name: 'Name conflict synonym'
        })
            .fetchAll()
            .then(synonyms => chai.expect(synonyms).to.have.lengthOf(2));
    });

    it('Blank KeywordTypes are not added', function() {
        return KeywordType.where({
            name: null
        })
            .fetchAll()
            .then(synonyms => chai.expect(synonyms).to.have.lengthOf(0));
    });

    it('Errors are handled gracefully and do not stop the import process', function() {
        // Create temporary obo file
        const badOboName = 'test_terms_fail.obo';
        const goodId = 'GO:0000002';

        // This causes an error because the first term is missing a name
        const oboData =
            'default-namespace: default_keyword_type\n' +
            '[Term]\n' +
            'id: GO:0000001\n' +
            '\n' +
            '[Term]\n' +
            'id: ' + goodId + '\n' +
            'name: test keyword 2\n';
        fs.writeFileSync(badOboName, oboData);

        // Dump test DB so the above term is the only added one
        return oboImporter.loadOboIntoDB(badOboName)
            .then(() => {
                knex('synonym').truncate();
                knex('keyword').truncate();
            }).then(()=> oboImporter.loadOboIntoDB(badOboName))
            .then(() => Keyword.where('external_id', goodId).fetch())
            .then(keyword => chai.expect(keyword).to.exist)
            .then(() => fs.unlinkSync(badOboName))
            .catch((error) => {
                fs.unlinkSync(badOboName);
                throw new Error(error);
            });
    });

    describe('Updating', function() {

        beforeEach('Clear DB, then run importer', function() {
            // Update tests modify the DB, so repopulate it before each test
            return Promise.all([
                knex('gene_term_annotation').truncate(),
                knex('gene_gene_annotation').truncate(),
                knex('comment_annotation').truncate()
            ])
                .then(() => knex('annotation').truncate())
                .then(() => knex('synonym').truncate())
                .then(() => knex('keyword').truncate())
                .then(() => knex('keyword_type').truncate())
                .then(() => oboImporter.loadOboIntoDB('./test/lib/test_terms.obo'));
        });

        it('Newly obsoleted Keywords are properly updated', function() {
            const expectedKeyword = {
                external_id: 'GO:0000004',
                name: 'test keyword 4',
                is_obsolete: true
            };

            return oboImporter.loadOboIntoDB('./test/lib/test_terms_update.obo')
                .then(() => Keyword.where({
                    external_id: 'GO:0000004'
                }).fetch())
                .then(keyword => {
                    let actual = keyword.toJSON();
                    actual.is_obsolete = !!actual.is_obsolete; // Cooerce into boolean
                    chai.expect(actual).to.contain(expectedKeyword);
                });
        });

        it('Non-obsolete keywords are not marked obsolete', function() {
            const expectedKeyword = {
                external_id: 'GO:0000001',
                name: 'test keyword 1',
                is_obsolete: false
            };

            return oboImporter.loadOboIntoDB('./test/lib/test_terms_update.obo')
                .then(() => Keyword.where({
                    external_id: 'GO:0000001'
                }).fetch())
                .then(keyword => {
                    let actual = keyword.toJSON();
                    actual.is_obsolete = !!actual.is_obsolete; // Cooerce into boolean
                    chai.expect(actual).to.contain(expectedKeyword);
                });
        });

        it('Existing term names are updated', function() {
            return oboImporter.loadOboIntoDB('./test/lib/test_terms_update.obo')
                .then(() => Keyword.where({
                    external_id: 'GO:0000003'
                }).fetch())
                .then(keyword => {
                    chai.expect(keyword.get('name')).to.equal('updated test keyword 3');
                });
        });

        it('User added term is merged into new OBO term with same name', function() {
            const newName = 'test keyword 5';
            return Keyword.addNew({
                name: newName,
                type_name: 'basic_keyword_type'
            })
                .then(() => oboImporter.loadOboIntoDB('./test/lib/test_terms_update.obo'))
                .then(() => Keyword.where({
                    name: newName
                }).fetch({
                    withRelated: 'synonyms'
                }))
                .then(keyword => {
                    chai.expect(keyword.get('external_id')).to.equal('GO:0000005');

                    let synonym = keyword.related('synonyms').first();
                    chai.expect(synonym).to.exist;
                    chai.expect(synonym.get('name')).to.equal('Name conflict synonym');
                });
        });

        it('New synonyms added for existing terms', function() {
            const expectedSubset = [{
                name: 'This is a new synonym'
            },
            {
                name: 'test keyword 2'
            }
            ];

            return oboImporter.loadOboIntoDB('./test/lib/test_terms_update.obo')
                .then(() => Keyword.where({
                    name: 'test keyword 1'
                }).fetch({
                    withRelated: 'synonyms'
                }))
                .then(keyword => {
                    let synonyms = keyword.related('synonyms').toJSON();
                    chai.expect(synonyms).to.containSubset(expectedSubset);
                });
        });

        it('Synonyms missing in new OBO should be removed', function() {
            const expectedSubset = [{
                name: 'another synonym'
            }];
            return oboImporter.loadOboIntoDB('./test/lib/test_terms_update.obo')
                .then(() => Keyword.where({
                    name: 'test keyword 1'
                }).fetch({
                    withRelated: 'synonyms'
                }))
                .then(keyword => {
                    let synonyms = keyword.related('synonyms').toJSON();
                    chai.expect(synonyms).to.not.containSubset(expectedSubset);
                });
        });

        it('Deleted Keywords are removed', function() {
            const removeExtId = 'GO:0000002';
            return oboImporter.loadOboIntoDB('./test/lib/test_terms_update.obo')
                .then(() => Keyword.where('external_id', removeExtId).fetch({
                    withRelated: 'synonyms'
                }))
                .then((keyword) => chai.expect(keyword).to.exist)
                .then(() => oboImporter.processDeletedTerms('./test/lib/test_terms_update.obo', './test/lib/test_terms.obo'))
                .then(() => Keyword.where('external_id', removeExtId).fetch({
                    withRelated: 'synonyms'
                }))
                .then(keyword => {
                    chai.expect(keyword).to.not.exist;
                });
        });

        it('Annotations referencing deleted Keywords are properly updated', function() {
            const deletedKeywordId = 'GO:0000002';
            const mergedKeywordId = 'GO:0000001';
            const testGT = testdata.gene_term_annotations[0];
            const testGG = testdata.gene_gene_annotations[0];

            // Add Annotations that reference a deleted Keyword
            let modelProm = knex.seed.run()
                .then(() => oboImporter.loadOboIntoDB('./test/lib/test_terms.obo'))
                .then(() => Keyword.where('external_id', deletedKeywordId).fetch())
                .then(keyword => {
                    let newId = keyword.get('id');
                    let newGTAnn1 = Object.assign({}, testGT);
                    let newGTAnn2 = Object.assign({}, testGT);
                    let newGGAnn = Object.assign({}, testGG);

                    delete newGTAnn1.id;
                    delete newGTAnn2.id;
                    delete newGGAnn.id;

                    newGTAnn1.method_id = newId;
                    newGTAnn2.keyword_id = newId;
                    newGGAnn.method_id = newId;

                    return Promise.all([
                        GeneTermAnnotation.forge(newGTAnn1).save(),
                        GeneTermAnnotation.forge(newGTAnn2).save(),
                        GeneGeneAnnotation.forge(newGGAnn).save()
                    ]);
                });

            // Run the importer and deleted term processor
            let importProm = modelProm
                .then(() => oboImporter.loadOboIntoDB('./test/lib/test_terms_update.obo'))
                .then(() => oboImporter.processDeletedTerms('./test/lib/test_terms_update.obo', './test/lib/test_terms.obo'));

            // Verify annotations have changed once we've run the importer
            return Promise.all([modelProm, importProm])
                .then(([model]) => {
                    let [gt1, gt2, gg] = model;

                    // Get updated versions of these annotations
                    return Promise.all([
                        gt1.refresh(),
                        gt2.refresh(),
                        gg.refresh(),
                        Keyword.where('external_id', mergedKeywordId).fetch()
                    ]);
                })
                .then(([gt1, gt2, gg, mergedKeyword]) => {
                    let mergeId = mergedKeyword.get('id');
                    chai.expect(gt1.get('method_id')).to.equal(mergeId);
                    chai.expect(gt2.get('keyword_id')).to.equal(mergeId);
                    chai.expect(gg.get('method_id')).to.equal(mergeId);
                });
        });

    });

});