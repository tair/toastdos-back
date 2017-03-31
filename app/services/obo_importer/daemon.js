'use strict';

const CronJob = require('cron').CronJob;

const importer = require('./obo_importer');

// Every day at 00:00
let ecoJob = new CronJob('0 0 0 * * *', () => {
	importer.updateKeywordsUsing('https://raw.githubusercontent.com/evidenceontology/evidenceontology/master/eco.obo');
});

// Every day at 00:10
let poJob = new CronJob('0 10 0 * * *', () => {
	importer.updateKeywordsUsing('http://purl.obolibrary.org/obo/po.obo');
});

// Every day at 01:00
let goJob = new CronJob('0 0 1 * * *', () => {
	importer.updateKeywordsUsing('http://www.geneontology.org/ontology/go.obo');
});

ecoJob.start();
poJob.start();
goJob.start();

console.log('Obo update daemon started');
