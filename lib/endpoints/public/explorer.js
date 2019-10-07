const express = require('express')
const {
  getAvailableAspects,
  getDefaultAspects,
  getAspectFilters,
  getAspectData
} = require('../../logic/explorer')
const { asyncHandler } = require('../../util/express')

/**
 * Routes for Bucket of Explorables.
 */

const router = express.Router()

router.get('/aspects/default',
  asyncHandler(async (req, res) => res.json(await getDefaultAspects()), true))

router.get('/aspects',
  asyncHandler(async (req, res) => res.json(await getAvailableAspects()), true))

router.get('/aspects/:id/filters',
  asyncHandler(async (req, res) => res.json(await getAspectFilters(req.params.id)), true))

router.get('/aspects/:id/data',
  asyncHandler(async (req, res) => res.json(await getAspectData(req.params.id, req.query)), true))

module.exports = router
