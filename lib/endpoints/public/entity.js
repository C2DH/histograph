const express = require('express')
const { asyncHandler } = require('../../util/express')
const controllerFactory = require('../../../controllers/entity')
const {
  getEntityMetadata
} = require('../../logic/entity/meta')

const router = express.Router()
// outdated and deprecated controller factory method
const controller = controllerFactory()

const EntityTypes = [
  'person',
  'location',
  'organization',
  'theme'
]
const ActionTypes = [
  'upvote',
  'downvote',
  'merge'
]
const entitySelector = EntityTypes.join('|')
const actionSelector = ActionTypes.join('|')
const idSelector = '[\\da-zA-Z\\-_]+'
const idsSelector = '[\\d,a-zA-Z\\-_]+'

const getEntityMetadataHandler = asyncHandler(async (req, res) => {
  const { id } = req.params
  const result = await getEntityMetadata(id)
  if (!result) return res.status(404).json({ message: 'No such entity' })
  return res.status(200).json(result)
}, true)

router.get(`/:id(${idsSelector})`, controller.getItem)
router.get(`/:id(${idSelector})/related/resource`, controller.getRelatedResources)
router.get(`/:id(${idSelector})/related/:entity(${entitySelector})`, controller.getRelatedEntities)
router.post(`/:id(${idSelector})/related/issue`, controller.createRelatedIssue)
router.delete(`/:id(${idSelector})/related/issue`, controller.removeRelatedIssue)
router.get(`/:id(${idSelector})/related/:entity(${entitySelector})/graph`, controller.getRelatedEntitiesGraph)
router.get(`/:id(${idSelector})/related/resource/graph`, controller.getRelatedResourcesGraph)
router.get(`/:id(${idSelector})/related/resource/timeline`, controller.getRelatedResourcesTimeline)
router.post(`/:id(${idSelector})/upvote`, controller.upvote)
router.post(`/:id(${idSelector})/downvote`, controller.downvote)
router.post(`/:entity_id(${idSelector})/related/resource/:resource_id(${idSelector})`, controller.createRelatedResource)
router.delete(`/:entity_id(${idSelector})/related/resource/:resource_id(${idSelector})`, controller.removeRelatedResource)
router.post(`/:entity_id(${idSelector})/related/resource/:resource_id(${idSelector})/:action(${actionSelector})`, controller.updateRelatedResource)

router.get(`/:id(${idSelector})/meta`, getEntityMetadataHandler)


module.exports = router
