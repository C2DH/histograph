const { get } = require('lodash')
const express = require('express')
const { asyncHandler } = require('../../util/express')
const {
  createAction,
  upvotePendingAction,
  downvotePendingAction
} = require('../../logic/actions')

const router = express.Router()

const getVotingThreshold = req => parseInt(get(req.app.get('settings'), 'actions.votingThreshold', 1), 10)

router.post('/', asyncHandler(async (req, res) => {
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


module.exports = router
