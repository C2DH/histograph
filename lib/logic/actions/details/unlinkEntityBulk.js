const assert = require('assert')
const {
  getEntityIdentifier,
} = require('../store')
const { executeQuery } = require('../../../util/neo4j')

async function createMeta({ entityUuid }) {
  const entityIdentifier = await getEntityIdentifier(entityUuid)
  assert.ok(entityIdentifier !== undefined, `Could not find entity ${entityUuid}`)

  return {
    entity: entityIdentifier
  }
}

const QueryUnlinkEntityFromAllResources = `
  OPTIONAL MATCH (e:entity { slug: {entitySlug} })-[a:appears_in]-(:resource)
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
  const {
    entityUuid, totalResources
  } = (await executeQuery(QueryUnlinkEntityFromAllResources, params))[0]

  if (entityUuid === null) {
    return [
      `Entity (${entityUuid}) not found`,
      false
    ]
  }
  return [
    `Entity (${entityUuid}) is unlinked from ${totalResources} resources`,
    true
  ]
}

module.exports = {
  createMeta,
  performListeners: [
    unlinkEntity
  ]
}
