const assert = require('assert')
const { generateUuid } = require('../../util/text')
const { validatedAction } = require('./util')
const {
  savePendingAction,
  setPendingActionPerformed,
  addVoteFor,
  addVoteAgainst,
  findPerformedActions
} = require('./store')

const unlinkEntity = require('./details/unlinkEntity')
const linkEntity = require('./details/linkEntity')
const changeEntityType = require('./details/changeEntityType')
const mergeEntities = require('./details/mergeEntities')

/**
 * NOTE: Metadata format for every action is described in a separate JSON schema.
 * Schemas are in `schema/json/change_actions`.
 */
const ActionMetaFactories = {
  'unlink-entity': unlinkEntity.createMeta,
  'link-entity': linkEntity.createMeta,
  'change-entity-type': changeEntityType.createMeta,
  'merge-entities': mergeEntities.createMeta
}

const ActionPerformListeners = {
  'unlink-entity': unlinkEntity.performListeners,
  'link-entity': linkEntity.performListeners,
  'change-entity-type': changeEntityType.performListeners,
  'merge-entities': mergeEntities.performListeners
}

/**
 * Perform an action if the action's `totalVote` has reached the `votingThreshold`.
 * @param {object} pendingAction action object
 * @param {number} votingThreshold threshold
 *
 * @return an object:
 * {
 *  "action" - action object
 *  "performed" - true (if has been performed) otherwise false
 *  "results" - a list of tuples. One tuple (`[string, bool]`) per `perform action` listener.
 *              Tuple: [<message describing the outcome>, <true_if_success_false_otherwise>]
 * }
 */
async function maybePerformAction(pendingAction, votingThreshold) {
  if (pendingAction.totalVote >= votingThreshold) {
    const { type, uuid } = pendingAction
    const actionListeners = ActionPerformListeners[type] || []
    const actionResults = await Promise.all(actionListeners.map(async fn => fn(pendingAction)))
    const action = await setPendingActionPerformed(uuid)
    return {
      action,
      performed: true,
      results: actionResults
    }
  }

  return {
    action: pendingAction,
    performed: false,
    results: []
  }
}

/**
 * Create a new action of type `type`, set vote to `1` and possibly perform it if the
 * `votingThreshold` parameter is set to `1`.
 *
 * @param {string} type one of types mentioned in `ActionMetaFactories` above.
 * @param {object} details parameters of the action. Actual parameters are in `createMeta`
 *                         methods of particular action.
 * @param {string} username username of the user performing the action.
 * @param {number} votingThreshold threshold the action needs to reach to be executed.
 *
 * @return see @return in `maybePerformAction`
 */
async function createAction(type, details, username, votingThreshold = 1) {
  const metaFactory = ActionMetaFactories[type]
  assert(metaFactory !== undefined, `Unknown action type "${type}"`)

  const meta = await metaFactory(details)
  const newAction = validatedAction({
    type,
    uuid: generateUuid(),
    initiatedBy: username,
    totalVote: 1,
    votedFor: [username],
    meta
  })

  const pendingAction = await savePendingAction(newAction)
  return maybePerformAction(pendingAction, votingThreshold)
}

/**
 * Upvote an action and possibly perform it if the
 * number of votes reach `votingThreshold`.
 * @param {string} uuid id of the action
 * @param {string} username name of the user upvoting the action
 * @param {number} votingThreshold threshold the action needs to reach to be executed.
 *
 * @return see @return in `maybePerformAction`
 */
async function upvotePendingAction(uuid, username, votingThreshold = 1) {
  const pendingAction = await addVoteFor(uuid, username)
  assert(pendingAction !== undefined, `No such pending action found or it has already been voted for: ${uuid}`)
  return maybePerformAction(pendingAction, votingThreshold)
}

/**
 * Downvote an action.
 * @param {string} uuid id of the action
 * @param {string} username name of the user upvoting the action
 *
 * @return action object
 */
async function downvotePendingAction(uuid, username) {
  const pendingAction = await addVoteAgainst(uuid, username)
  assert(pendingAction !== undefined, `No such pending action found or it has already been voted for: ${uuid}`)
  return pendingAction
}

async function getPerformedActions(skip, limit) {
  const actions = await findPerformedActions(skip, limit)
  return actions
}

module.exports = {
  createAction,
  upvotePendingAction,
  downvotePendingAction,
  getPerformedActions
}
