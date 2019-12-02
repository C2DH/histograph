const express = require('express')
const { asyncHandler } = require('../../util/express')
const controllerFactory = require('../../../controllers/suggest')
const {
  findEntitiesByNamePattern
} = require('../../logic/entity/suggest')

const router = express.Router()
// outdated and deprecated controller factory method
const controller = controllerFactory()

const EntityTypes = [
  'entity',
  'person',
  'location',
  'organization',
  'theme'
]
const entitySelector = EntityTypes.join('|')
const idSelector = '[\\da-zA-Z\\-_]+'
const idsSelectorExtended = '[\\da-zA-Z_\\-][\\d,a-zA-Z\\-_]+'
const idsSelector = '[\\d,a-zA-Z\\-_]+'

const findEntitiesByNamePatternEndpoint = asyncHandler(async (req, res) => {
  const {
    query
  } = req.query
  const [limit, skip] = [
    req.query.limit,
    req.query.skip
  ].map(v => (v === undefined ? undefined : parseInt(v, 10)))

  const result = await findEntitiesByNamePattern(query, { skip, limit })
  res.status(200).json(result)
}, true)

router.get('/', controller.suggest)
router.get('/stats', controller.getStats)
router.get('/resource', controller.getResources)
router.get('/resource/graph', controller.getResourcesGraph)
router.get(`/:entity(${entitySelector})`, controller.getEntities)
router.get(`/:entity(${entitySelector})/graph`, controller.getEntitiesGraph)
router.get('/all-in-between', controller.allInBetween)
router.get(`/all-in-between/:ids(${idsSelectorExtended})/resource`, controller.getAllInBetweenResources)
router.get(`/all-in-between/:ids(${idsSelectorExtended})/resource/graph`, controller.getAllInBetweenGraph)
router.get(`/all-in-between/:ids(${idsSelectorExtended})/resource/timeline`, controller.getAllInBetweenTimeline)
router.get(`/all-shortest-paths/:ids(${idsSelector})`, controller.allShortestPaths)
router.get(`/unknown-node/:id(${idSelector})`, controller.getUnknownNode)
router.get(`/unknown-nodes/:ids(${idsSelector})`, controller.getUnknownNodes)
router.get(`/neighbors/:ids(${idsSelector})`, controller.getNeighbors)
router.get(`/shared/:ids(${idsSelector})/resource`, controller.getSharedResources)
router.get(`/shared/:ids(${idsSelector})/:entity(${entitySelector})`, controller.getSharedEntities)
router.get('/viaf', controller.viaf.autosuggest)
router.get('/dbpedia', controller.dbpedia)

router.get('/entities/matching', findEntitiesByNamePatternEndpoint)

module.exports = router
