const assert = require('assert')
const { generateUuid } = require('../../util/text')
const { validatedAction } = require('./util')
const {
  savePendingAction,
  setPendingActionPerformed,
  addVoteFor,
  addVoteAgainst
} = require('./store')

const unlinkEntity = require('./details/unlinkEntity')
const linkEntity = require('./details/linkEntity')
const changeEntityType = require('./details/changeEntityType')

const ActionMetaFactories = {
  'unlink-entity': unlinkEntity.createMeta,
  'link-entity': linkEntity.createMeta,
  'change-entity-type': changeEntityType.createMeta,
}

const ActionPerformListeners = {
  'unlink-entity': unlinkEntity.performListeners,
  'link-entity': linkEntity.performListeners,
  'change-entity-type': changeEntityType.performListeners,
}

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

async function upvotePendingAction(uuid, username, votingThreshold = 1) {
  const pendingAction = await addVoteFor(uuid, username)
  assert(pendingAction !== undefined, `No such pending action found or it has already been voted for: ${uuid}`)
  return maybePerformAction(pendingAction, votingThreshold)
}

async function downvotePendingAction(uuid, username, votingThreshold = 1) {
  const pendingAction = await addVoteAgainst(uuid, username)
  assert(pendingAction !== undefined, `No such pending action found or it has already been voted for: ${uuid}`)
  return maybePerformAction(pendingAction, votingThreshold)
}

module.exports = {
  createAction,
  upvotePendingAction,
  downvotePendingAction
}
