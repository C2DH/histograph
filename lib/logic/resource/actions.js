const { get, first } = require('lodash')
const decypher = require('decypher')
const { prepareQuery, executeQuery } = require('../../util/neo4j')
const { createResourcePayloadToMergeResource } = require('./converters')
const {
  createResourcePayloadToMergeEntityList,
  createResourcePayloadToMergeRelationshipResourceVersionList
} = require('../entity/converters')
const { toNeo4jJson, fromNeo4jJson } = require('../../converters/db')

const resourceQueries = decypher('./queries/resource.cyp')
const entityQueries = decypher('./queries/entity.cyp')
const versionQueries = decypher('./queries/version.cyp')

/**
 * Create resource and optionally entities if provided. If `skipNER` is `true` in payload
 * the resource is marked as `discovered`, which means no NER/NED will be performed.
 *
 * @param {object} payload object satisfying schema `api/management/create_resource/payload.json`
 * @param {string} username username of the user who creates this resource.
 *
 * @returns {object} resource as returned by `resourceQueries.merge_resource` query
 */
async function processCreateResourcePayload(payload, username) {
  // 1. save resource
  const mergeResourcePayload = createResourcePayloadToMergeResource(payload, username)
  const neo4jMergeResourcePayload = toNeo4jJson(mergeResourcePayload, {
    separators: {
      title: '_',
      caption: '_',
      content: '_',
      url: '_'
    }
  })

  const resources = await executeQuery(
    prepareQuery(resourceQueries.merge_resource, neo4jMergeResourcePayload),
    neo4jMergeResourcePayload
  )
  const resource = first(resources)
  const resourceUuid = get(resource, 'props.uuid')
  const resourceNeo4jId = get(resource, 'props.id')

  // 2. save entities
  const mergeEntitiesPayloadList = createResourcePayloadToMergeEntityList(
    payload, resourceUuid, username
  )
  const entitiesResponse = await Promise.all(mergeEntitiesPayloadList
    .map(toNeo4jJson)
    .map(async mergeEntityPayload => executeQuery(
      prepareQuery(entityQueries.merge_entity, mergeEntityPayload),
      mergeEntityPayload
    )))
  const entities = entitiesResponse.map(([r]) => r.props).map(fromNeo4jJson)

  // 3. save versions
  const mergeVersionsPayloadList = createResourcePayloadToMergeRelationshipResourceVersionList(
    payload, entities, resourceNeo4jId
  )

  await Promise.all(mergeVersionsPayloadList
    .map(toNeo4jJson)
    .map(async mergeVersionPayload => executeQuery(
      prepareQuery(versionQueries.merge_relationship_resource_version, mergeVersionPayload),
      mergeVersionPayload
    )))

  // 4. Mark resource as discovered if NER/NED is explicitly skipped
  const skipNER = get(payload, 'skipNER', false)
  if (skipNER) {
    await executeQuery(
      resourceQueries.mark_discovered,
      { uuid: resourceUuid }
    )
  }

  return resource
}

module.exports = {
  processCreateResourcePayload
}
