const assert = require('assert')
const {
  getEntityIdentifier,
} = require('../store')
const { executeQuery } = require('../../../util/neo4j')

async function createMeta({ entityUuid, oldType, newType }) {
  const entityIdentifier = await getEntityIdentifier(entityUuid, oldType)
  assert.ok(entityIdentifier !== undefined, `Could not find entity ${entityUuid}`)
  return {
    entity: entityIdentifier,
    newType
  }
}

const QueryChangeType = (oldType, newType) => `
  MATCH (e:entity:${oldType} { slug: {slug} })
  REMOVE e:${oldType}
  SET e:${newType}
  RETURN { uuid: e.uuid }
`

async function changeEntityType({ meta: { entity: { slug, type }, newType } }) {
  const result = (await executeQuery(QueryChangeType(type, newType), { slug }))[0]

  if (!result) {
    return [
      `Could not find entity with slug "${slug}" and type "${type}" to change type to ${newType}`,
      false
    ]
  }

  return [
    `Entity (${result.uuid}) type has been changed from "${type}" to "${newType}"`,
    true
  ]
}

module.exports = {
  createMeta,
  performListeners: [
    changeEntityType
  ]
}
