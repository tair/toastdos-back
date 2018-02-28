const {
    exportAllData
} = require('./export_data');

exportAllData()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });