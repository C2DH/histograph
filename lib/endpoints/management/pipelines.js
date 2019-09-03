const assert = require('assert')
const express = require('express')
const { isString } = require('lodash')
const createError = require('http-errors')

const { asyncHandler } = require('../../util/express')
const {
  startPipelineProcess,
  startLegacyPipelineProcess,
  getPipelineProcessLogs
} = require('../../pipelines/execute')

const router = express.Router()

/**
 * Launch pipeline process
 */
router.post('/processes', asyncHandler(async (req, res) => {
  const { name, parameters } = req.body
  const { isLegacy = false } = req.query
  assert(isString(name), 'Name must be provided')
  const fn = isLegacy ? startLegacyPipelineProcess : startPipelineProcess
  const refId = await fn(name, parameters)
  res.json({ refId })
}))

/**
 * Get `stdout` and `stderr` content of a particular pipeline process.
 */
router.get('/processes/:id', asyncHandler(async (req, res) => {
  const logs = await getPipelineProcessLogs(req.params.id)
  if (!logs) throw createError(404, 'No such pipeline process ID found')
  res.json(logs)
}))

module.exports = router
