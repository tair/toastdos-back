'use strict';

const CronJob = require('cron').CronJob;

const updater = require('./obo_updater');
const eco_mapping_updater = require('../eco_mapping_importer/eco_mapping_updater');

// Every day at 00:00
let ecoJob = new CronJob('0 0 0 * * *', () => {
	updater.updateKeywordsUsing('https://raw.githubusercontent.com/evidenceontology/evidenceontology/master/eco.obo');
});

// Every day at 00:05
let ecoMappingJob = new CronJob('0 5 0 * * *', () => {
	eco_mapping_updater.updateKeywordMappingsUsing('https://raw.githubusercontent.com/evidenceontology/evidenceontology/master/gaf-eco-mapping-derived.txt');
});

// Every day at 00:10
let poJob = new CronJob('0 10 0 * * *', () => {
	updater.updateKeywordsUsing('http://purl.obolibrary.org/obo/po.obo');
});

// Every day at 01:00
let goJob = new CronJob('0 0 1 * * *', () => {
	updater.updateKeywordsUsing('http://www.geneontology.org/ontology/go.obo');
});

ecoJob.start();
ecoMappingJob.start();
poJob.start();
goJob.start();

console.log('Obo update daemon started');
