'use strict';

const Draft = require('../models/draft');

const response = require('../lib/responses');

/**
 * Gets all drafts for the requesting user.
 *
 * Responses:
 * 200 on successful retrieval.
 * 500 on internal error.
 */
function getDraftsForUser(req, res, next) {
	return Draft.where('submitter_id', req.user.get('id'))
		.fetch()
		.then(draft => {
			draft.set('wip_state', JSON.parse(draft.get('wip_state')));
			return response.ok(res, draft);
		})
		.catch(err => {
			if (err.message === 'EmptyResponse') {
				return response.notFound(res, 'Draft not found');
			}

			return response.defaultServerError(res, err);
		});
}

/**
 * Creates a new draft for the submitting user.
 *
 * Responses:
 * 201 on successful draft creation.
 * 400 if missing wip_state.
 * 500 on internal error.
 */
function createDraft(req, res, next){

	if (!req.body.wip_state) {
		return response.badRequest(res, `Draft (wip state) is missing or invalid`);
	}

	Draft.forge({
		submitter_id: req.user.get('id'),
		wip_state: JSON.stringify(req.body.wip_state)
	})
	.save()
	.then(draft => response.created(res, draft))
	.catch(err => response.defaultServerError(res, err));
}

module.exports={
	getDraftsForUser,
	createDraft
};
