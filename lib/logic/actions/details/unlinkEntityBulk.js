const assert = require('assert')
const {
  getEntityIdentifier,
} = require('../store')
const { withTransaction } = require('../../../util/neo4j')

async function createMeta({ entityUuid }) {
  const entityIdentifier = await getEntityIdentifier(entityUuid)
  assert.ok(entityIdentifier !== undefined, `Could not find entity ${entityUuid}`)

  return {
    entity: entityIdentifier
  }
}

const QueryUnlinkEntityFromAllResources = `
  OPTIONAL MATCH (e:entity { slug: {entitySlug} })-[a:appears_in]-(:resource)
  WITH e, a LIMIT 1000
  DELETE a
  WITH e.uuid as entityUuid, count(*) as totalResources
  RETURN {
    entityUuid: entityUuid,
    totalResources: totalResources
  }
`

async function unlinkEntity({ meta }) {
  const { entity: { slug: entitySlug } } = meta
  const params = { entitySlug }

  let totalResourcesCounter = 0
  let unlinkedEntityUuid
  await withTransaction(async executeQuery => {
    let lastUuid = null
    do {
      const {
        entityUuid, totalResources
      // eslint-disable-next-line no-await-in-loop
      } = (await executeQuery(QueryUnlinkEntityFromAllResources, params))[0]
      if (entityUuid !== null) {
        unlinkedEntityUuid = entityUuid
        totalResourcesCounter += totalResources
      }
      lastUuid = entityUuid
    } while (lastUuid !== null)
  })

  if (unlinkedEntityUuid === null) {
    return [
      `Entity (${unlinkedEntityUuid}) not found`,
      false
    ]
  }
  return [
    `Entity (${unlinkedEntityUuid}) is unlinked from ${totalResourcesCounter} resources`,
    true
  ]
}

module.exports = {
  createMeta,
  performListeners: [
    unlinkEntity
  ]
}
