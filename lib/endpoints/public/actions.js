const { get } = require('lodash')
const express = require('express')
const { asyncHandler } = require('../../util/express')
const {
  createAction,
  upvotePendingAction,
  downvotePendingAction,
  getPerformedActions
} = require('../../logic/actions')

const router = express.Router()

const getVotingThreshold = req => parseInt(get(req.app.get('settings'), 'actions.votingThreshold', 1), 10)

router.post('/', asyncHandler(async (req, res) => {
  // Timeout of 10 minutes. Heavy actions on big corpora may take a long time
  req.setTimeout((10 * 60 * 1000) + 1)
  const threshold = getVotingThreshold(req)
  const { type, parameters } = req.body
  const result = await createAction(type, parameters, req.user.username, threshold)
  res.status(201).json(result)
}, true))

router.post('/:actionId/upvotes', asyncHandler(async (req, res) => {
  const threshold = getVotingThreshold(req)
  const result = await upvotePendingAction(req.params.actionId, req.user.username, threshold)
  res.status(201).json(result)
}, true))

router.post('/:actionId/downvotes', asyncHandler(async (req, res) => {
  const threshold = getVotingThreshold(req)
  const result = await downvotePendingAction(req.params.actionId, req.user.username, threshold)
  res.status(201).json(result)
}, true))

router.get('/', asyncHandler(async (req, res) => {
  const { skip = 0, limit = 50 } = req.query
  const results = await getPerformedActions(parseInt(skip, 10), parseInt(limit, 10))
  res.status(200).json(results)
}, true))


module.exports = router
