const express = require('express')
const {
  getExplorerConfiguration,
  getAspectFilters,
  getAspectData
} = require('../../logic/explorer')
const { asyncHandler } = require('../../util/express')

const router = express.Router()

router.get('/configuration', asyncHandler(async (req, res) => {
  const configuration = await getExplorerConfiguration()
  res.json(configuration)
}, true))

router.get('/aspects/:id/filters', asyncHandler(async (req, res) => {
  const filters = await getAspectFilters(req.params.id)
  res.json(filters)
}, true))

router.get('/aspects/:id/data', asyncHandler(async (req, res) => {
  const data = await getAspectData(req.params.id, req.query)
  res.json(data)
}, true))

module.exports = router
