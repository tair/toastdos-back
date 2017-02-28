'use strict';

const chai = require('chai');
chai.use(require('chai-subset'));
const knex = require('../../app/lib/bookshelf').knex;
const rewire = require('rewire'); // To access private functions in modules

const locusHelper      = require('../../app/lib/locus_submission_helper');
const annotationHelper = rewire('../../app/lib/annotation_submission_helper');

const Locus     = require('../../app/models/locus');
const LocusName = require('../../app/models/locus_name');
const Keyword   = require('../../app/models/keyword');

const testdata = require('../../seeds/test/test_data.json');

describe('TAIR API', function() {

	before('Setup SQLite memory database', function() {
		return knex.migrate.latest();
	});

	beforeEach('Populate SQLite memory DB with fresh test data', function() {
		return knex.seed.run();
	});

	describe('Verify Locus', function() {

		it('Correctly identifies TAIR Locus name', function() {
			const tairLocus = 'AT1G10000';
			const expectedSource = 'TAIR';
			return locusHelper.verifyLocus(tairLocus).then(locus => {
				chai.expect(locus.source).to.equal(expectedSource);
			});
		});

		it('Correctly identifies Uniprot Locus name', function() {
			const uniprotLocus = 'Q6XXX8';
			const expectedSource = 'Uniprot';
			return locusHelper.verifyLocus(uniprotLocus).then(locus => {
				chai.expect(locus.source).to.equal(expectedSource);
			});
		});

		it('Correctly identifies RNA Central Locus name', function() {
			const rnaLocus = 'URS0000000018';
			const expectedSource = 'RNA Central';
			return locusHelper.verifyLocus(rnaLocus).then(locus => {
				chai.expect(locus.source).to.equal(expectedSource);
			});
		});

		// FIXME I have no idea how to test this, but it's really something we should test
		it('Falls back to other sources when guessed source does not contain locus name');

		it('Totally non-existent Locus name responds with error', function() {
			const fakeLocus = 'FakeLocus';
			return locusHelper.verifyLocus(fakeLocus).then(locus => {
				throw new Error('Somehow found the fake locus');
			}).catch(err => {
				chai.expect(err.message).to.equal(`No Locus found for name ${fakeLocus}`);
			});
		});

	});

	describe('Add Locus', function() {

		it('Totally new loci create all proper records', function() {
			const locusName = 'Q6XXX8';
			const locusSymbol = 'Fox';
			const locusFullname = 'Jupiter the Red Fox';
			const submitterId = 1;

			const expectedSource = {name: 'Uniprot'};
			const expectedLocusName = { locus_name: locusName };
			const expectedGeneSymbol = {
				symbol: locusSymbol,
				full_name: locusFullname
			};
			const expectedTaxon = {
				name: 'Vulpes vulpes',
				taxon_id: 9627
			};

			return locusHelper.addLocusRecords(locusName, locusFullname, locusSymbol, submitterId)
				.then(createdLocusName => {
					let createdLocusId = createdLocusName.related('locus').attributes.id;

					return Locus.where({id: createdLocusId})
						.fetch({withRelated: ['taxon', 'names', 'symbols']})
						.then(res => {
							let actual = res.toJSON();
							chai.expect(actual.taxon).to.contain(expectedTaxon);
							chai.expect(actual.names[0]).to.contain(expectedLocusName);
							chai.expect(actual.symbols[0]).to.contain(expectedGeneSymbol);

							return LocusName.where({id: actual.names[0].id}).fetch({withRelated: 'source'});
						})
						.then(res => {
							let actual = res.toJSON();
							chai.expect(actual.source).to.contain(expectedSource);
						});
				});
		});

		it('Creating new Loci and updating existing Loci return the same values', function() {
			const locusName = 'Q6XXX8';
			const locusSymbol = 'Fox';
			const locusFullname = 'Jupiter the Red Fox';
			const submitterId = 1;

			return locusHelper.addLocusRecords(locusName, locusFullname, locusSymbol, submitterId)
				.then(addedLocus => locusHelper.addLocusRecords(locusName, locusFullname, locusSymbol, submitterId)
					.then(modifiedLocus => {
						chai.expect(addedLocus.toJSON()).to.deep.equal(modifiedLocus.toJSON());
					})
				);
		});

		it('New symbols for existing loci are created', function() {
			const existingLocusName = testdata.locus_name[1];
			const existingGeneSymbol = testdata.gene_symbol[2];
			const newSubmitter = testdata.users[1];
			const newFullName = 'New fullname';
			const newSymbol = 'NFN';

			const expectedGeneSymbols = [
				existingGeneSymbol,
				{
					symbol : newSymbol,
					full_name : newFullName
				}
			];

			return locusHelper.addLocusRecords(existingLocusName.locus_name, newFullName, newSymbol, newSubmitter.id)
				.then(modifiedLocus => {
					return Locus.where({id: modifiedLocus.related('locus').attributes.id})
						.fetch({withRelated: 'symbols'})
						.then(res => {
							let actual = res.toJSON();
							chai.expect(actual.symbols).to.containSubset(expectedGeneSymbols);
						});
				});
		});

		it('Invalid locus does not create records', function() {
			const invalidLocusName = 'FakeLocus';
			return locusHelper.addLocusRecords(invalidLocusName, 'ignore', 'IG', 1)
				.then(createdLocus => {
					throw new Error('Created Locus record using a bad name');
				})
				.catch(err => {
					chai.expect(err.message).to.equal(`No Locus found for name ${invalidLocusName}`);
				});
		});

	});

	/**
	 * We use a module to give us access to the private functions in the
	 * submission helper so we can isolate tests just to the functions they cover.
	 * If we went through the standard workflow for each test, one failure
	 * would cause a bunch of unrelated downstream failures.
	 *
	 * The submission tests go through the whole workflow properly.
	 *
	 * Also:
	 * GT - Gene Term
	 * GG - Gene Gene
	 * C  - Comment
	 */
	describe('Add Annotation', function() {

		beforeEach('Build locus map from test data', function () {
			return LocusName.fetchAll({withRelated: 'locus'}).then(locusNames => {
				this.currentTest.locusMap = locusNames
					.map(locus => ({[locus.attributes.locus_name]: locus}))
					.reduce((curMap, curVal) => Object.assign(curMap, curVal));
			});
		});

		it('GT annotation recognizes invalid fields', function() {
			const testType = 'MOLECULAR_FUNCTION'; // GT annotation type
			const invalidFieldName = 'invalidField';
			const testGTAnnotation = {
				type: testType,
				data: {
					internalPublicationId: testdata.publications[0].id,
					submitterId: testdata.users[0].id,
					locusName: testdata.locus_name[0].locus_name,
					method: { id: testdata.keywords[0].id },
					keyword: { name: 'New Keyword Name'},
					evidence: testdata.locus_name[1].locus_name,
					[invalidFieldName]: 'I am an invalid field'
				}
			};

			return annotationHelper.addAnnotationRecords(testGTAnnotation, this.test.locusMap).then(res => {
				throw new Error('Invalid fields were not rejected');
			}).catch(err => {
				// NOTE that 'evidence' is not picked up here.
				chai.expect(err.message).to.equal(`Invalid ${testType} fields: ${invalidFieldName}`);
			});
		});

		it('GG annotation recognizes invalid fields', function() {
			const testType = 'PROTEIN_INTERACTION'; // GG type
			const invalidFieldName = 'invalidField';
			const testGGAnnotation = {
				type: testType,
				data: {
					internalPublicationId: testdata.publications[0].id,
					submitterId: testdata.users[0].id,
					locusName: testdata.locus_name[0].locus_name,
					method: { id: testdata.keywords[0].id },
					locusName2: testdata.locus_name[1].locus_name,
					[invalidFieldName]: 'I am an invalid field'
				}
			};

			return annotationHelper.addAnnotationRecords(testGGAnnotation, this.test.locusMap).then(res => {
				throw new Error('Invalid fields were not rejected');
			}).catch(err => {
				chai.expect(err.message).to.equal(`Invalid ${testType} fields: ${invalidFieldName}`);
			});
		});

		it('C annotation recognizes invalid fields', function() {
			const testType = 'COMMENT';
			const invalidFieldName = 'invalidField';
			const testCAnnotation = {
				type: testType,
				data: {
					internalPublicationId: testdata.publications[0].id,
					submitterId: testdata.users[0].id,
					locusName: testdata.locus_name[0].locus_name,
					text: 'Some text',
					[invalidFieldName]: 'I am an invalid field'
				}
			};

			return annotationHelper.addAnnotationRecords(testCAnnotation, this.test.locusMap).then(res => {
				throw new Error('Invalid fields were not rejected');
			}).catch(err => {
				chai.expect(err.message).to.equal(`Invalid ${testType} fields: ${invalidFieldName}`);
			});
		});

		it('GT annotation recognizes missing fields', function() {
			const testType = 'BIOLOGICAL_PROCESS'; // A different GT type
			const reqFields = ['internalPublicationId', 'submitterId', 'locusName', 'method', 'keyword'];
			const testGTAnnotation = {
				type: testType,
				data: {}
			};

			return annotationHelper.addAnnotationRecords(testGTAnnotation, this.test.locusMap).then(res => {
				throw new Error('Missing fields were not detected');
			}).catch(err => {
				chai.expect(err.message).to.contain(`Missing ${testType} fields:`);
				reqFields.forEach(field => chai.expect(err.message).to.contain(field));
				chai.expect(err.message).to.not.contain('evidence'); // Because evidence is optional
			});
		});

		it('GG annotation recognizes missing fields', function() {
			const testType = 'PROTEIN_INTERACTION'; // GG type
			const reqFields = ['internalPublicationId', 'submitterId', 'locusName', 'method', 'locusName2'];
			const testGGAnnotation = {
				type: testType,
				data: {}
			};

			return annotationHelper.addAnnotationRecords(testGGAnnotation, this.test.locusMap).then(res => {
				throw new Error('Missing fields were not detected');
			}).catch(err => {
				chai.expect(err.message).to.contain(`Missing ${testType} fields:`);
				reqFields.forEach(field => chai.expect(err.message).to.contain(field));
			});
		});

		it('C annotation recognizes missing fields', function() {
			const testType = 'COMMENT';
			const reqFields = ['internalPublicationId', 'submitterId', 'locusName', 'text'];
			const testCAnnotation = {
				type: testType,
				data: {}
			};

			return annotationHelper.addAnnotationRecords(testCAnnotation, this.test.locusMap).then(res => {
				throw new Error('Missing fields were not detected');
			}).catch(err => {
				chai.expect(err.message).to.contain(`Missing ${testType} fields:`);
				reqFields.forEach(field => chai.expect(err.message).to.contain(field));
			});
		});

		it('Method keywords must specify an id XOR name', function() {
			const testType = 'PROTEIN_INTERACTION'; // GG type
			const badMethod = { badField: 'Not id or name' };
			const testGGAnnotation = {
				type: testType,
				data: {
					internalPublicationId: testdata.publications[0].id,
					submitterId: testdata.users[0].id,
					locusName: testdata.locus_name[0].locus_name,
					method: badMethod,
					locusName2: testdata.locus_name[1].locus_name
				}
			};

			return annotationHelper.addAnnotationRecords(testGGAnnotation, this.test.locusMap).then(res => {
				throw new Error('Invalid fields were not rejected');
			}).catch(err => {
				chai.expect(err.message).to.equal('id xor name required for Keywords');
			});
		});

		it('Keyword keywords must specify an id XOR name', function() {
			const testType = 'SUBCELLULAR_LOCATION'; // Yet another GT annotation type
			const badKeyword = { id: 'something', name: 'New Keyword Name' };
			const testGTAnnotation = {
				type: testType,
				data: {
					internalPublicationId: testdata.publications[0].id,
					submitterId: testdata.users[0].id,
					locusName: testdata.locus_name[0].locus_name,
					method: { id: testdata.keywords[0].id },
					keyword: badKeyword,
					evidence: testdata.locus_name[1].locus_name
				}
			};

			return annotationHelper.addAnnotationRecords(testGTAnnotation, this.test.locusMap).then(res => {
				throw new Error('Invalid fields were not rejected');
			}).catch(err => {
				chai.expect(err.message).to.equal('id xor name required for Keywords');
			});
		});

		it('GT verification rejects for invalid locus', function() {
			const verifyGeneTermFields = annotationHelper.__get__('verifyGeneTermFields');
			const badLocusName = 'Bad Locus Name';
			const partialGTAnnotation = {
				data: {
					locusName: badLocusName,
					method: { id: testdata.keywords[0].id },
					keyword: { id: testdata.keywords[0].id },
					evidence: testdata.locus[1].locus_name
				}
			};

			return verifyGeneTermFields(partialGTAnnotation, this.test.locusMap).then(res => {
				throw new Error('Invalid fields were not rejected');
			}).catch(err => {
				chai.expect(err.message).to.equal(`Locus ${badLocusName} not present in submission`);
			});
		});

		it('GG verification rejects for invalid locus', function() {
			const verifyGeneGeneFields = annotationHelper.__get__('verifyGeneGeneFields');
			const badLocusName = 'Bad Locus Name';
			const partialGGAnnotation = {
				data: {
					locusName: badLocusName,
					method: { id: testdata.keywords[0].id },
					locusName2: testdata.locus[1].locus_name
				}
			};

			return verifyGeneGeneFields(partialGGAnnotation, this.test.locusMap).then(res => {
				throw new Error('Invalid fields were not rejected');
			}).catch(err => {
				chai.expect(err.message).to.equal(`Locus ${badLocusName} not present in submission`);
			});
		});

		it('C verification rejects for invalid locus', function() {
			const verifyCommentFields = annotationHelper.__get__('verifyCommentFields');
			const badLocusName = 'Bad Locus Name';
			const partialCAnnotation = {
				data: {
					locusName: badLocusName,
					text: 'Some sample text'
				}
			};

			return verifyCommentFields(partialCAnnotation, this.test.locusMap).then(res => {
				throw new Error('Invalid fields were not rejected');
			}).catch(err => {
				chai.expect(err.message).to.equal(`Locus ${badLocusName} not present in submission`);
			});
		});

		it('GT verification rejects for non-existent method keyword id', function() {
			const verifyGeneTermFields = annotationHelper.__get__('verifyGeneTermFields');
			const badMethodId = 100;
			const partialGTAnnotation = {
				data: {
					locusName: testdata.locus_name[0].locus_name,
					method: { id: badMethodId },
					keyword: { id: testdata.keywords[0].id },
					evidence: testdata.locus_name[1].locus_name
				}
			};

			return verifyGeneTermFields(partialGTAnnotation, this.test.locusMap).then(res => {
				throw new Error('Invalid fields were not rejected');
			}).catch(err => {
				chai.expect(err.message).to.equal(`Method id ${badMethodId} does not reference an existing Keyword`);
			});
		});

		it('GT verification rejects for non-existent keyword keyword id', function() {
			const verifyGeneTermFields = annotationHelper.__get__('verifyGeneTermFields');
			const badMethodId = 100;
			const partialGTAnnotation = {
				data: {
					locusName: testdata.locus_name[0].locus_name,
					method: { id: testdata.keywords[0].id },
					keyword: { id: badMethodId },
					evidence: testdata.locus_name[1].locus_name
				}
			};

			return verifyGeneTermFields(partialGTAnnotation, this.test.locusMap).then(res => {
				throw new Error('Invalid fields were not rejected');
			}).catch(err => {
				chai.expect(err.message).to.equal(`Keyword id ${badMethodId} does not reference an existing Keyword`);
			});
		});

		it('GT verification rejects for invalid evidence locus', function() {
			const verifyGeneTermFields = annotationHelper.__get__('verifyGeneTermFields');
			const badLocusName = 'Bad Locus Name';
			const partialGTAnnotation = {
				data: {
					locusName: testdata.locus_name[0].locus_name,
					method: { id: testdata.keywords[0].id },
					keyword: { id: testdata.keywords[0].id },
					evidence: badLocusName
				}
			};

			return verifyGeneTermFields(partialGTAnnotation, this.test.locusMap).then(res => {
				throw new Error('Invalid fields were not rejected');
			}).catch(err => {
				chai.expect(err.message).to.equal(`Locus ${badLocusName} not present in submission`);
			});
		});

		it('GG verification rejects for non-existent method keyword id', function() {
			const verifyGeneGeneFields = annotationHelper.__get__('verifyGeneGeneFields');
			const badMethodId = 100;
			const partialGGAnnotation = {
				data: {
					locusName: testdata.locus_name[0].locus_name,
					method: { id: badMethodId },
					locusName2: testdata.locus_name[1].locus_name
				}
			};

			return verifyGeneGeneFields(partialGGAnnotation, this.test.locusMap).then(res => {
				throw new Error('Invalid fields were not rejected');
			}).catch(err => {
				chai.expect(err.message).to.equal(`Method id ${badMethodId} does not reference an existing Keyword`);
			});
		});

		it('GG verification rejects for invalid second locus', function() {
			const verifyGeneGeneFields = annotationHelper.__get__('verifyGeneGeneFields');
			const badLocusName = 'Bad Locus Name';
			const partialGGAnnotation = {
				data: {
					locusName: testdata.locus_name[0].locus_name,
					method: { id: testdata.keywords[0].id },
					locusName2: badLocusName
				}
			};

			return verifyGeneGeneFields(partialGGAnnotation, this.test.locusMap).then(res => {
				throw new Error('Invalid fields were not rejected');
			}).catch(err => {
				chai.expect(err.message).to.equal(`Locus ${badLocusName} not present in submission`);
			});
		});

		it('GT creator adds new method keywords with eco KeywordType', function() {
			const createGeneTermRecords = annotationHelper.__get__('createGeneTermRecords');
			const unusedKeywordScope = testdata.keyword_types[0].name;
			const testKeywordName = 'New Test Keyword';
			const partialGTAnnotation = {
				data: {
					locusName: testdata.locus_name[0].locus_name,
					method: { name: testKeywordName },
					keyword: { id: testdata.keywords[0].id }
				}
			};
			const expectedKeywordName = 'eco';

			return createGeneTermRecords(partialGTAnnotation, this.test.locusMap, unusedKeywordScope).then(gtAnn => {
				return Keyword.where({id: gtAnn.attributes.method_id}).fetch({withRelated: 'keywordType'});
			}).then(methodKeyword => {
				chai.expect(methodKeyword.related('keywordType').attributes.name).to.equal(expectedKeywordName);
			});
		});

		it('GT creator adds new keyword keywords KeywordType matching scope', function() {
			const createGeneTermRecords = annotationHelper.__get__('createGeneTermRecords');
			const testKeywordScope = testdata.keyword_types[0].name;
			const testKeywordName = 'New Test Keyword';
			const partialGTAnnotation = {
				data: {
					locusName: testdata.locus_name[0].locus_name,
					method: { id: testdata.keywords[2].id },
					keyword: { name: testKeywordName }
				}
			};

			return createGeneTermRecords(partialGTAnnotation, this.test.locusMap, testKeywordScope).then(gtAnn => {
				return Keyword.where({id: gtAnn.attributes.keyword_id}).fetch({withRelated: 'keywordType'});
			}).then(keywordKeyword => {
				chai.expect(keywordKeyword.related('keywordType').attributes.name).to.equal(testKeywordScope);
			});
		});

		it('GT sub-annotation is properly added', function() {
			const createGeneTermRecords = annotationHelper.__get__('createGeneTermRecords');
			const unusedKeywordScope = testdata.keyword_types[0].name;

			const expectedMethod = testdata.keywords[2];
			const expectedKeyword = testdata.keywords[0];
			const expectedEvidenceLocus = testdata.locus[1];

			const partialGTAnnotation = {
				data: {
					locusName: testdata.locus_name[0].locus_name,
					method: { id: expectedMethod.id },
					keyword: { id: expectedKeyword.id },
					evidence: testdata.locus_name[1].locus_name
				}
			};

			return createGeneTermRecords(partialGTAnnotation, this.test.locusMap, unusedKeywordScope).then(gtAnn => {
				return gtAnn.fetch({withRelated: ['method', 'keyword', 'evidence']});
			}).then(fullGTAnnotation => {
				let fullGTObj = fullGTAnnotation.toJSON();

				chai.expect(fullGTObj.method).to.contain(expectedMethod);
				chai.expect(fullGTObj.keyword).to.contain(expectedKeyword);
				chai.expect(fullGTObj.evidence).to.contain(expectedEvidenceLocus);
			});
		});

		it('GG creator adds new method keywords with eco KeywordType', function() {
			const createGeneGeneRecords = annotationHelper.__get__('createGeneGeneRecords');
			const unusedKeywordScope = testdata.keyword_types[0].name;

			const expectedKeywordName = 'eco';
			const testKeywordName = 'New Test Keyword';
			const partialGGAnnotation = {
				data: {
					locusName: testdata.locus_name[0].locus_name,
					method: { name: testKeywordName },
					locusName2: testdata.locus_name[1].locus_name
				}
			};

			return createGeneGeneRecords(partialGGAnnotation, this.test.locusMap, unusedKeywordScope).then(ggAnn => {
				return Keyword.where({id: ggAnn.attributes.method_id}).fetch({withRelated: 'keywordType'});
			}).then(methodKeyword => {
				chai.expect(methodKeyword.related('keywordType').attributes.name).to.equal(expectedKeywordName);
			});
		});

		it('GG sub-annotation is properly added', function() {
			const createGeneGeneRecords = annotationHelper.__get__('createGeneGeneRecords');
			const unusedKeywordScope = testdata.keyword_types[0].name;

			const expectedMethod = testdata.keywords[2];
			const expectedLocus2 = testdata.locus[1];

			const partialGGAnnotation = {
				data: {
					locusName: testdata.locus_name[0].locus_name,
					method: { id: expectedMethod.id },
					locusName2: testdata.locus_name[1].locus_name
				}
			};

			return createGeneGeneRecords(partialGGAnnotation, this.test.locusMap, unusedKeywordScope).then(ggAnn => {
				return ggAnn.fetch({withRelated: ['method', 'locus2']});
			}).then(fullGGAnnotation => {
				let fullGGObj = fullGGAnnotation.toJSON();

				chai.expect(fullGGObj.method).to.contain(expectedMethod);
				chai.expect(fullGGObj.locus2).to.contain(expectedLocus2);
			});
		});

		it('C sub-annotation is properly added', function() {
			const createCommentRecords = annotationHelper.__get__('createCommentRecords');
			const unusedKeywordScope = testdata.keyword_types[0].name;

			const partialCAnnotation = {
				data: {
					locusName: testdata.locus_name[0].locus_name,
					text: 'Some cool text'
				}
			};

			return createCommentRecords(partialCAnnotation, this.test.locusMap, unusedKeywordScope).then(cAnn => {
				chai.expect(cAnn.attributes.id).to.exist;
				chai.expect(cAnn.attributes.text).to.be.a('string');
			});
		});

		it('Only one Keyword record is created when two annotations try to add the same new Keyword', function() {
			const createKeywordRecord = annotationHelper.__get__('createKeywordRecord');
			const testKeywordType = testdata.keyword_types[0];
			const testKeywordName = 'New Test Keyword';

			let keywordPromise1 = createKeywordRecord(testKeywordName, testKeywordType.name);
			let keywordPromise2 = createKeywordRecord(testKeywordName, testKeywordType.name);

			return Promise.all([keywordPromise1, keywordPromise2]).then(([newKWID1, newKWID2]) => {
				chai.expect(newKWID1).to.equal(newKWID2);
			});
		});

		it('Parent annotation added with all proper fields');

	});

});
