// Use this seed with `npm run exec knex seed:run test_data`

const testdata = require('./test_data.json');

exports.seed = function(knex, Promise) {
	return Promise.all([
		knex('synonym').truncate(),
		knex('keyword').truncate(),
		knex('keyword_type').truncate(),
		knex('user').truncate()
	]).then(() => {
		return Promise.all([
			].concat(
				testdata.keyword_types.map(keywordType => knex('keyword_type').insert(keywordType))
			).concat(
				testdata.keywords.map(keyword => knex('keyword').insert(keyword))
			).concat(
				testdata.synonyms.map(synonym => knex('synonym').insert(synonym))
			).concat(
				testdata.users.map(user => knex('user').insert(user))
			)
		);
	});
};
