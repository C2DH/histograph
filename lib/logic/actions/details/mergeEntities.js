const assert = require('assert')
const {
  getEntitiesIdentifiers,
  getEntityIdentifier
} = require('../store')
const { executeQuery } = require('../../../util/neo4j')

async function createMeta({ originalEntityUuidList, newEntityUuid }) {
  const entitiesIdentifiers = await getEntitiesIdentifiers(originalEntityUuidList)
  assert.ok(entitiesIdentifiers.length === originalEntityUuidList.length,
    `Could not find all entities for Ids: ${originalEntityUuidList.join(', ')}`)

  const entityIdentifier = await getEntityIdentifier(newEntityUuid)
  assert.ok(entityIdentifier !== undefined, `Could not find entity ${newEntityUuid}`)

  const {
    slugs,
    names,
    types
  } = entitiesIdentifiers.reduce((acc, { slug, name, type }) => {
    acc.slugs.push(slug)
    acc.names.push(name)
    acc.types.push(type)
    return acc
  }, { slugs: [], names: [], types: [] })

  return {
    originalEntities: {
      slugs,
      names,
      types
    },
    newEntity: entityIdentifier
  }
}

const QueryMergeEntities = newType => `
WITH {slugs} as slugs, {types} as types
UNWIND range(0, size(slugs)-1) as idx

  WITH slugs[idx] as slug, types[idx] as type 
  MATCH (old_entity {slug: slug})
  WHERE last(labels(old_entity)) = type
    
  WITH old_entity
  MATCH (old_entity)-[:appears_in]->(r:resource)

  WITH collect(r.uuid) as r_uuids, old_entity    
  MATCH (new_entity:entity:${newType} {slug: {newSlug} })
    
  UNWIND r_uuids as r_uuid
    MATCH (r:resource { uuid: r_uuid })
    MATCH (old_entity)-[a_old:appears_in]->(r)
    MERGE (new_entity)-[a_new:appears_in]->(r)
    SET a_new = a_old
    DELETE a_old
  
RETURN count(r.uuid) as count
`

async function changeEntityType({
  meta: { originalEntities: { slugs, types }, newEntity: { type: newType, slug: newSlug } }
}) {
  const result = (await executeQuery(QueryMergeEntities(newType), { slugs, types, newSlug }))[0]

  if (!result) {
    return [
      `Could not merge entities with slugs "${slugs.join(', ')}" and types "${types.join(', ')}" into entity to ${newType}`,
      false
    ]
  }

  return [
    `${result.count} resources have been updated while changing slugs "${slugs.join(', ')}" and types "${types.join(', ')}" into entity ${newSlug} (${newType})`,
    true
  ]
}

module.exports = {
  createMeta,
  performListeners: [
    changeEntityType
  ]
}
