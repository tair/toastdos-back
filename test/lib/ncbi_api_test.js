'use strict';

const chai = require('chai');

const NCBI = require('../../app/lib/ncbi_api');

describe('NCBI API', function() {

    it('Good Taxon ID successfully returns taxon info', function() {
        const goodTaxonId = 77133;
        const expectedData = {
            taxId: 77133,
            scientificName: 'uncultured bacterium'
        };

        return NCBI.getTaxonById(goodTaxonId).then(info => {
            chai.expect(info).to.contain(expectedData);
        });
    });

    it('Bad Taxon ID responds with error', function() {
        const badTaxonId = 99999999;
        return NCBI.getTaxonById(badTaxonId).then(() => {
            throw new Error('Returned taxon info with a bad ID');
        }).catch(err => {
            chai.expect(err.message).to.equal(`No Taxon matches id ${badTaxonId}`);
        });
    });

    it('Good Taxon scientific name successfully returns taxon info', function() {
        const goodTaxonName = 'Vulpes vulpes';
        const expectedData = {
            taxId: 9627,
            scientificName: 'Vulpes vulpes',
            commonName: 'red fox',
        };

        return NCBI.getTaxonByScientificName(goodTaxonName).then(info => {
            chai.expect(info).to.contain(expectedData);
        });
    });

    it('Bad Taxon scientific name responds with error', function() {
        const badTaxonName = 'Bad Taxon Name';
        return NCBI.getTaxonByScientificName(badTaxonName).then(() => {
            throw new Error('Returned taxon info with a bad scientific name');
        }).catch(err => {
            chai.expect(err.message).to.equal(`No Taxon matches name ${badTaxonName}`);
        });
    });

    it('Taxon name that returns multiple results responds with error', function() {
        const multipleResponseName = 'yersinia';
        return NCBI.getTaxonByScientificName(multipleResponseName).then(() => {
            throw new Error('Returned taxon info for multiple things');
        }).catch(err => {
            chai.expect(err.message).to.equal(`Multiple Taxa found for name ${multipleResponseName}`);
        });
    });

});