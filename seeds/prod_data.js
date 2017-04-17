
const proddata = require('./prod_data.json');

const bookshelf = require('../app/lib/bookshelf');

const Role             = require('../app/models/role');
const KeywordType      = require('../app/models/keyword_type');
const AnnotationType   = require('../app/models/annotation_type');
const AnnotationStatus = require('../app/models/annotation_status');

/**
 * Adds all provided data.
 * Prevents duplicates and foreign key constraint violations.
 *
 * @param Model - Bookshelf model for added data
 * @param data - Array of data to add
 */
function addAllNonExisting(Model, data) {
	const ModelSet = bookshelf.Collection.extend({model: Model});

	// Easiest way to do this idempotently is to let the DB itself catch
	// the unique constraint, then swallow the error for the unique violation.
	let modelProms = ModelSet
		.forge(data)
		.invokeMap('save')
		.map(promise => promise.catch(err => {
			// SQLite3 and PostgreSQL unique constraint errors
			if (err.message.includes('SQLITE_CONSTRAINT: UNIQUE constraint failed')
			 || err.message.includes('duplicate key value violates unique constraint')) {
				// Swallow the error
			} else {
				throw err;
			}
		}));

	return Promise.all(modelProms);
}

exports.seed = function(knex, Promise) {
	return Promise.all([
		addAllNonExisting(KeywordType, proddata.keyword_types),
		addAllNonExisting(AnnotationStatus, proddata.annotation_statuses),
		addAllNonExisting(AnnotationType, proddata.annotation_types),
		addAllNonExisting(Role, proddata.roles)
	]);
};
