
const proddata = require('./prod_data.json');

exports.seed = function(knex, Promise) {
	return Promise.all([
		...proddata.keyword_types.map(keyword => knex('keyword_type').insert(keyword)),
		...proddata.annotation_statuses.map(status => knex('annotation_status').insert(status)),
		...proddata.annotation_types.map(type => knex('annotation_type').insert(type)),
		...proddata.roles.map(role => knex('role').insert(role))
	]);
};
