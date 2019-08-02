const express = require('express')
const { assignIn } = require('lodash')
const decypher = require('decypher')
const { executeQuery } = require('../../util/neo4j')
const { asyncHandler } = require('../../util/express')

const topicQueries = decypher('./queries/topic.cyp')
const router = express.Router()

/**
 * Update topic: set label and keywords.
 */
router.put('/:set/:index', asyncHandler(async (req, res) => {
  const { set, index } = req.params
  const topic = req.body
  const topicPayload = assignIn({}, topic, { index, set })
  const result = await executeQuery(topicQueries.create_or_update, topicPayload)

  res.json(result[0])
}))

module.exports = router
