const {
  cloneDeep, clone, assignIn,
  get, set, unzip, isNil,
  identity
} = require('lodash')
const { createResourcePayloadToResource } = require('../../logic/resource/converters')
const { toNeo4jResource } = require('../../logic/resource/actions')
const {
  createResourcePayloadToEntityAndAppearanceList,
  createResourcePayloadToVersionList
} = require('../../logic/entity/converters')
const { toNeo4jJson } = require('../../converters/db')


const getNowDate = () => new Date().toISOString()
const getNowTime = () => Math.floor(Date.now() / 1000)

const cloneWith = (obj, extras) => assignIn(
  cloneDeep(obj),
  extras
)

const withCreatedUpdatedTimestamp = obj => cloneWith(obj, {
  creation_date: getNowDate(),
  creation_time: getNowTime(),
  last_modification_date: getNowDate(),
  last_modification_time: getNowTime()
})

const withCreatedTimestamp = obj => cloneWith(obj, {
  creation_date: getNowDate(),
  creation_time: getNowTime(),
})

const withDefaultEntityDetails = obj => cloneWith(obj, {
  celebrity: 0,
  score: 0,
  status: 1,
  df: 1,
})

const withDefaultAppearanceDetails = obj => cloneWith(obj, {
  upvote: [],
  celebrity: 0,
  score: 0,
})

const withUuid = uuid => obj => cloneWith(obj, {
  uuid
})

function wrapAsNodeWithIdIncrement(lastIds, key, labels) {
  return properties => {
    const id = get(lastIds, key, 0) + 1
    set(lastIds, key, id)

    return {
      id,
      labels,
      properties
    }
  }
}

function wrapAsNodeWithId(id, labels) {
  return properties => ({
    id,
    labels,
    properties
  })
}

function wrapAsRelationship(startId, endId, labels) {
  return properties => ({
    startId,
    endId,
    labels,
    properties
  })
}

function getEntityIds(entityTypeAndSlugToIdMapping, entity, type) {
  const key = `${type}:${entity.slug}`
  return get(entityTypeAndSlugToIdMapping, key, [])
}

/**
 *
 * @param {object} createResourcePayload - object satisfying
 *                 `api/management/create_resource/payload.json`
 * @param {object} entityTypeAndSlugToIdsMapping - a mapping of entity type and slug to its numeric
 *                 ID and UUI in the database. 
 *                 Key format: `<type>:<slug>`. 
 *                 Value is a two items array: `[<numericEntityId>, <UUID>]`.
 * @param {object} lastIds - a collection of the last IDs used for nodes and relationships
 *                 where the key is the node or relationship name and the value is the numeric
 *                 ID of this entity. The keys are the same as listed in `return`
 *                 statement (nodes only).
 *
 * @return {object} - a collection of nodes and relationship created from the payload:
 *                     - `resource` (N)
 *                     - `entity` (N)
 *                     - `appears_in` (R)
 *                     - `version` (N)
 *                     - `describes` (R)
 *                  Every item is a list.
 */
function createResourcePayloadToEntitiesAndRelationships(
  createResourcePayload,
  entityTypeAndSlugToIdMapping = {},
  lastIds = {}
) {
  const lastIdsCopy = clone(lastIds)

  const resource = [createResourcePayload]
    .map(createResourcePayloadToResource)
    .map(withCreatedUpdatedTimestamp)
    .map(toNeo4jResource)
    .map(wrapAsNodeWithIdIncrement(lastIdsCopy, 'resource', ['resource']))[0]

  const [entities, appearances] = unzip(
    createResourcePayloadToEntityAndAppearanceList(createResourcePayload)
      .map(({ entity, appearance, type }) => {
        const [entityId, entityUuid] = getEntityIds(entityTypeAndSlugToIdMapping, entity, type)
        const wrapAsNode = !isNil(entityId)
          ? wrapAsNodeWithId(entityId, ['entity', type])
          : wrapAsNodeWithIdIncrement(lastIdsCopy, 'entity', ['entity', type])


        const e = [entity]
          .map(withDefaultEntityDetails)
          .map(withCreatedUpdatedTimestamp)
          .map(!isNil(entityUuid) ? withUuid(entityUuid) : identity)
          .map(toNeo4jJson)
          .map(wrapAsNode)[0]

        const a = [appearance]
          .map(withDefaultAppearanceDetails)
          .map(withCreatedUpdatedTimestamp)
          .map(toNeo4jJson)
          .map(wrapAsRelationship(e.id, resource.id, ['appears_in']))[0]

        return [e, a]
      })
  )

  const versions = createResourcePayloadToVersionList(
    createResourcePayload,
    entities.map(e => e.properties)
  ).map(withCreatedTimestamp)
    .map(toNeo4jJson)
    .map(wrapAsNodeWithIdIncrement(lastIdsCopy, 'version', ['version', 'annotation']))

  const describes = versions
    .map(({ id }) => wrapAsRelationship(id, resource.id, ['describes'])(withCreatedUpdatedTimestamp({})))

  return {
    resource: [resource],
    entity: entities,
    appears_in: appearances,
    version: versions,
    describes
  }
}

module.exports = {
  createResourcePayloadToEntitiesAndRelationships
}
