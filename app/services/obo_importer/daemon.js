'use strict';

const CronJob = require('cron').CronJob;

const importer = require('./obo_importer');

// Every day at midnight
let ecoJob = new CronJob('0 0 0 * * *', () => {
	importer.updateKeywordsUsing('https://raw.githubusercontent.com/evidenceontology/evidenceontology/master/eco.obo');
});

ecoJob.start();

