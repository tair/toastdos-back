
const proddata = require('./prod_data.json');

exports.seed = function(knex, Promise) {
	return Promise.all([
		...proddata.keyword_types.map(keyword => knex('keyword_type').insert(keyword)),
		...proddata.annotation_statuses.map(status => knex('annotation_status').insert(status))
	]);
};
