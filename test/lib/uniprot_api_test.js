'use strict';

const chai = require('chai');

const Uniprot = require('../../app/lib/uniprot_api');

describe('Uniprot API', function() {
    this.timeout(10000);

    it('Whole existing ID returns single Gene', function() {
        const validId = 'Q6XXX8';
        const expectedLocus = {
            source: 'Uniprot',
            locus_name: validId,
            taxon_name: 'Vulpes vulpes',
            taxon_id: 9627
        };

        return Uniprot.getLocusByName(validId).then(result => {
            chai.expect(result).to.deep.equal(expectedLocus);
        }).catch(err => {
            throw err;
        });
    });

    it('Partial existing ID causes error because it doesn\'t exist', function() {
        const validPartialId = 'Q131';
        return Uniprot.getLocusByName(validPartialId).then(() => {
            throw new Error('Did not reject with partial result');
        }).catch(err => {
            chai.expect(err.message).to.equal(`No Locus found for name ${validPartialId}`);
        });
    });

    it('Non-existing name causes error due to no records', function() {
        const fakeName = 'fakename';
        return Uniprot.getLocusByName(fakeName).then(() => {
            throw new Error('Returned a gene for a fake name');
        }).catch(err => {
            chai.expect(err.message).to.equal(`No Locus found for name ${fakeName}`);
        });
    });
});