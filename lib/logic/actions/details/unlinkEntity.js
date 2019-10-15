const assert = require('assert')
const {
  getLinkedEntityAndResourceIdentifiers,
} = require('../store')
const { executeQuery } = require('../../../util/neo4j')

async function createMeta({ entityUuid, resourceUuid }) {
  const identifiers = getLinkedEntityAndResourceIdentifiers(entityUuid, resourceUuid)
  assert.ok(identifiers !== undefined, `Could not find entity ${entityUuid} linked to resource ${resourceUuid}`)

  const {
    entityIdentifier,
    resourceIdentifier
  } = identifiers

  return {
    entity: entityIdentifier,
    resource: resourceIdentifier
  }
}

const QueryUnlinkEntityFromResource = `
  OPTIONAL MATCH (e:entity { slug: {entitySlug} })
  OPTIONAL MATCH (r:resource { slug: {resourceSlug} })
  OPTIONAL MATCH (e)-[a:appears_in]->(r)
  DELETE a
  RETURN {
    entityUuid: e.uuid,
    resourceUuid: r.uuid,
    appearanceId: id(a)
  }
`

async function unlinkEntity({ meta }) {
  const { entity: { slug: entitySlug }, resource: { slug: resourceSlug } } = meta
  const params = { entitySlug, resourceSlug }
  const {
    entityUuid, resourceUuid, appearanceId
  } = (await executeQuery(QueryUnlinkEntityFromResource, params))[0]
  if (appearanceId === null) {
    return [
      `Entity (${entityUuid}) is not linked to resource (${resourceUuid})`,
      false
    ]
  }
  if (entityUuid === null || resourceUuid === null) {
    return [
      `Either entity (${entityUuid}) or resource (${resourceUuid}) not found`,
      false
    ]
  }
  return [
    `Entity (${entityUuid}) is unlinked from resource (${resourceUuid})`,
    true
  ]
}

module.exports = {
  createMeta,
  performListeners: [
    unlinkEntity
  ]
}
