'use strict';

const Draft = require('../models/draft');

const response = require('../lib/responses');

/**
 * Gets all drafts for the requesting user.
 *
 * Responses:
 * 200 on successful retrieval.
 * empty draft instead of 404 if not found.
 * 500 on internal error.
 */
function getDraftsForUser(req, res) {
    return Draft.where('submitter_id', req.user.get('id'))
        .fetch()
        .then(draft => {
            const emptyDraft = "{\"publicationId\":\"\",\"genes\":[{\"locusName\":\"\",\"geneSymbol\":\"\",\"fullName\":\"\"}],\"annotations\":[]}";
            return response.ok(res, draft ? draft.get('wip_state') : emptyDraft);
        })
        .catch(err => {
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
function createDraft(req, res) {
    if (!req.body.wip_state) {
        return response.badRequest(res, `Draft (wip state) is missing or invalid`);
    }

    Draft.where({
        submitter_id: req.user.get('id')
    }).destroy().then(() => {

        Draft.forge({
            submitter_id: req.user.get('id'),
            wip_state: JSON.stringify(req.body.wip_state)
        })
        .save()
        .then(draft => response.created(res, draft))
        .catch(err => response.defaultServerError(res, err));
    });
}

/**
 * Deletes a draft by it's internal ID.
 *
 * Responses:
 * 200 on successful delete.
 * 400 if the draft with the given ID didn't exist.
 * 403 if deleted draft doesn't belong to requesting user.
 * 500 on internal error.
 */
function deleteDraft(req, res) {
    Draft.where({
        id: req.params.id
    })
        .fetch({
            require: true
        })
        .then(draft => {
            if (draft.get('submitter_id') !== req.user.get('id')) {
                return response.forbidden(res, 'Unauthorized to delete this draft');
            }

            return draft.destroy()
                .then(deletedDraft => response.ok(res, deletedDraft));
        })
        .catch(err => {
            if (err.message === 'EmptyResponse') {
                return response.notFound(res, `No draft with id ${req.params.id} found`);
            }

            return response.defaultServerError(res, err);
        });
}

module.exports = {
    getDraftsForUser,
    createDraft,
    deleteDraft
};