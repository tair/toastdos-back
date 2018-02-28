'use strict';

/**
 * Eco Evidence Code Importer Service
 */

const stream     = require('stream');
const fs         = require('fs');
const LineStream = require('byline').LineStream;

const EcoMappingParser   = require('../../lib/eco_mapping_parser').EcoMappingParser;

const KeywordMapping     = require('../../models/keyword_mapping');


/**
 * Custom Writable stream
 */
class DataImporter extends stream.Writable {

	/**
	 * Processes a single mapping line, adding the KewordMapping
	 * to the Database.
	 *
	 * This function is called for each chunk the stream processes.
	 *
	 * @returns {Promise.<null>}
	 */
    _write(chunk, enc, next) {
        if (!chunk) next();
        let mapping = JSON.parse(chunk.toString('ascii'));
        let eco_id = mapping.eco_id;
        let evidence_code = mapping.evidence_code;

        this._addKeywordMapping(eco_id,evidence_code)
			.then(() => {
    next();
				// TODO: investigate promise problem
    return null;
})
			.catch((err) => {
    next(err);
});
    }

	/**
	 * Adds a new Keyword Mapping or updates an existing Keyword Mapping.
	 *
	 * @param eco_id - EcoId
	 * @param evidence_code - evidence code
	 * @returns {Promise.<KeywordMapping>} Created or existing keyword mapping
	 */
    _addKeywordMapping(ecoId, evidenceCode) {
        return KeywordMapping.addOrGet({
            eco_id:ecoId,
            evidence_code:evidenceCode
        });
    }
}


/**
 * Adds each mapping in the file into the DB.
 *
 * @param filepath - path of the file to read in
 * @returns {Promise.<TResult>}
 */
function loadEcoMappingIntoDB(filepath) {
    let dataImporter = new DataImporter();
    let eco_mapping_parser = new EcoMappingParser();
    let lineStream = new LineStream({keepEmptyLines: true});

	// clear all old mapping entries
    return KeywordMapping.clearAll().then(() => {
        return new Promise((resolve, reject) => {
            fs.createReadStream(filepath)
				.pipe(lineStream)
				.pipe(eco_mapping_parser)
				.pipe(dataImporter)
				.on('finish', () => resolve())
				.on('error', err => reject(err));
        })
		.catch(function(err){
    console.error(err);
});
    });
}

module.exports = {
    loadEcoMappingIntoDB
};
