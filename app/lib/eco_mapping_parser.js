'use strict';

const stream = require('stream');

class EcoMappingParser extends stream.Transform {

    constructor() {
        super({
            readableObjectMode: true,
            writableObjectMode: true
        });
    }

    _transform(chunk, encoding, next) {
        let line = chunk.toString();
        let parts = line.split('\t');

        if (parts.length != 3) {
            return next();
            //return next(new Error("Invalid input"));
        }

        let [eco_id, evidence_code, comment] = parts;
        let mapStr = JSON.stringify({
            'eco_id': eco_id,
            'evidence_code': evidence_code,
            'comment': comment
        });

        next(null, mapStr);
    }
}

module.exports.EcoMappingParser = EcoMappingParser;