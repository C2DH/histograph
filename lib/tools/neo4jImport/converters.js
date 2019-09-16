const {
  cloneDeep, clone, assignIn,
  get, set, unzip, isNil,
  identity, includes, last,
  without
} = require('lodash')
const { validateWith } = require('../../util/json')
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

function wrapAsNodeWithIdIncrement(lastIds, key, labels, spaces) {
  return properties => {
    const id = get(lastIds, key, 0) + 1
    set(lastIds, key, id)

    return {
      id,
      labels,
      properties,
      spaces
    }
  }
}

function wrapAsNodeWithId(id, labels, spaces) {
  return properties => ({
    id,
    labels,
    properties,
    spaces
  })
}

function wrapAsRelationship(startId, endId, type, spaces) {
  return properties => ({
    startId,
    endId,
    type,
    properties,
    spaces
  })
}

const typeAndSlugTag = (entity, type) => `${type}:${entity.slug}`

function getEntityIds(entityTypeAndSlugToIdMapping, newMapping, entity, type) {
  const key = typeAndSlugTag(entity, type)
  return get(entityTypeAndSlugToIdMapping, key, get(newMapping, key, []))
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
  const newIdsMapping = {}

  const resource = [createResourcePayload]
    .map(createResourcePayloadToResource)
    .map(withCreatedUpdatedTimestamp)
    .map(validateWith('db/resource.json'))
    .map(toNeo4jResource)
    .map(wrapAsNodeWithIdIncrement(lastIdsCopy, 'resource', ['resource'], { id: 'resource' }))[0]

  const [entities = [], appearances = []] = unzip(
    createResourcePayloadToEntityAndAppearanceList(createResourcePayload)
      .map(({ entity, appearance, type }) => {
        const [entityId, entityUuid] = getEntityIds(
          entityTypeAndSlugToIdMapping, newIdsMapping, entity, type
        )
        const wrapAsNode = !isNil(entityId)
          ? wrapAsNodeWithId(entityId, ['entity', type], { id: 'entity' })
          : wrapAsNodeWithIdIncrement(lastIdsCopy, 'entity', ['entity', type], { id: 'entity' })

        const e = [entity]
          .map(withDefaultEntityDetails)
          .map(withCreatedUpdatedTimestamp)
          .map(!isNil(entityUuid) ? withUuid(entityUuid) : identity)
          .map(validateWith('db/entity.json'))
          .map(toNeo4jJson)
          .map(wrapAsNode)[0]

        if (isNil(entityId)) {
          const key = typeAndSlugTag(entity, type)
          newIdsMapping[key] = [e.id, e.properties.uuid]
        }

        const a = [appearance]
          .map(withDefaultAppearanceDetails)
          .map(withCreatedUpdatedTimestamp)
          .map(validateWith('db/appears_in.json'))
          .map(toNeo4jJson)
          .map(wrapAsRelationship(e.id, resource.id, 'appears_in', { startId: 'entity', endId: 'resource' }))[0]

        return [e, a]
      })
  )

  const versions = createResourcePayloadToVersionList(
    createResourcePayload,
    entities.map(e => e.properties)
  ).map(withCreatedTimestamp)
    .map(validateWith('db/version.json'))
    .map(toNeo4jJson)
    .map(wrapAsNodeWithIdIncrement(lastIdsCopy, 'version', ['version', 'annotation'], { id: 'version' }))

  const describes = versions
    .map(({ id }) => wrapAsRelationship(id, resource.id, 'describes', { startId: 'version', endId: 'resource' })(withCreatedUpdatedTimestamp({})))

  return {
    resource: [resource],
    entity: entities,
    appears_in: appearances,
    version: versions,
    describes
  }
}

function createResourcePayloadListToEntitiesAndRelationships(
  createResourcePayloads,
  entityTypeAndSlugToIdMapping = {},
  lastIds = {},
  mutableMapping = false
) {
  const lastIdsCopy = clone(lastIds)
  const entityTypeAndSlugToIdMappingCopy = mutableMapping
    ? entityTypeAndSlugToIdMapping
    : clone(entityTypeAndSlugToIdMapping)

  const nodesLabels = ['resource', 'entity', 'version']
  const relationshipsLabels = ['appears_in', 'describes']
  const nodesAndRelationshipsLabels = nodesLabels.concat(relationshipsLabels)


  const results = createResourcePayloads.reduce(
    (acc, payload) => {
      const result = createResourcePayloadToEntitiesAndRelationships(
        payload, entityTypeAndSlugToIdMappingCopy, lastIds
      )

      nodesAndRelationshipsLabels.forEach(l => {
        let items = result[l]

        if (l === 'entity') {
          // filter out all entities that are already present in the mapping.
          // and add all remaining entities to the mapping
          items = items.map(item => {
            const key = typeAndSlugTag(item.properties, last(without(item.labels, 'entity')))
            if (!(key in entityTypeAndSlugToIdMappingCopy)) {
              entityTypeAndSlugToIdMappingCopy[key] = [item.id, item.properties.uuid]
              return item
            }
            return undefined
          }).filter(i => i !== undefined)
        }

        acc[l] = acc[l].concat(items)
        if (includes(nodesLabels, l) && items.length > 0) {
          lastIdsCopy[l] = last(items).id
        }
      })

      return acc
    },
    nodesAndRelationshipsLabels.reduce((acc, f) => { acc[f] = []; return acc }, {})
  )

  return {
    results,
    entityTypeAndSlugToIdMapping: entityTypeAndSlugToIdMappingCopy,
    lastIds: lastIdsCopy
  }
}

module.exports = {
  createResourcePayloadToEntitiesAndRelationships,
  createResourcePayloadListToEntitiesAndRelationships,
  typeAndSlugTag
}
