// @ts-check
const {
  get, first, groupBy,
  toPairs, flatten,
  sortBy
} = require('lodash')
const decypher = require('decypher')
const { prepareQuery, withTransaction } = require('../../util/neo4j')
const { createResourcePayloadToResource } = require('./converters')
const {
  createResourcePayloadToEntityAndAppearanceList
} = require('../entity/converters')
const {
  toNeo4jJson, fromNeo4jJson, toNeo4jResource, toNeo4jAppearance
} = require('../../converters/db')

const resourceQueries = decypher('./queries/resource.cyp')
const entityQueries = decypher('./queries/entity.cyp')

/**
 * Create resource and optionally entities if provided. If `skipNER` is `true` in payload
 * the resource is marked as `discovered`, which means no NER/NED will be performed.
 *
 * @param {object} payload object satisfying schema `api/management/create_resource/payload.json`
 * @param {string} username username of the user who creates this resource.
 *
 * @returns {Promise<object>} resource as returned by `resourceQueries.merge_resource` query
 */
async function processCreateResourcePayload(payload, username = null) {
  return withTransaction(async executeQuery => {
    // 1. save resource
    const resourceObject = createResourcePayloadToResource(payload)

    const resultingResources = await executeQuery(
      resourceQueries.save_or_update,
      { resources: [resourceObject].map(toNeo4jResource), username }
    )

    const resource = first(resultingResources)
    const resourceUuid = get(resource, 'props.uuid')

    // 2. save entities
    const entityAndAppearanceList = createResourcePayloadToEntityAndAppearanceList(payload)
    const entityAndAppearanceListByType = groupBy(entityAndAppearanceList, 'type')

    const entityQueryAndParamsList = toPairs(entityAndAppearanceListByType)
      .map(([type, entityAndAppearances]) => {
        const query = prepareQuery(entityQueries.save_or_update_with_appearance, { type })
        const params = {
          entities_and_appearances: entityAndAppearances
            .map(({ entity, appearance }) => ({
              entity: toNeo4jJson(entity),
              appearance: toNeo4jAppearance(appearance)
            })),
          resource_uuid: resourceUuid,
          username
        }
        return [query, params]
      })

    const entitiesResponse = await Promise.all(entityQueryAndParamsList
      .map(async ([query, params]) => executeQuery(query, params)))

    const unsortedEntitiesWithType = flatten(entitiesResponse
      .map(items => items.map(r => [fromNeo4jJson(r.props), r.type])))

    const entitySlugAndTypeList = entityAndAppearanceList
      .map(({ entity: { slug }, type }) => `${slug}:${type}`)
    sortBy(
      unsortedEntitiesWithType,
      ([entity, type]) => entitySlugAndTypeList.indexOf(`${entity.slug}:${type}`)
    ).map(([entity]) => entity)

    // 4. Mark resource as discovered if NER/NED is explicitly skipped
    const skipNER = get(payload, 'skipNER', false)
    if (skipNER) {
      await executeQuery(
        resourceQueries.mark_discovered,
        { uuid: resourceUuid }
      )
    }
    return resource
  })
}

module.exports = {
  processCreateResourcePayload
}
