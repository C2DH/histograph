const {
  get, uniq, groupBy, mapValues,
  isUndefined, omitBy
} = require('lodash')
const YAML = require('yamljs')
const { validated } = require('../../util/json')

const {
  text: { slugify },
  uuid: generateUuid,
  now: getNowTime
} = require('../../../helpers')

function entityFromPayloadToMergeEntity(e, resourceUuid, now, languageCodes, frequency, username) {
  return omitBy({
    resource_uuid: resourceUuid,
    slug: get(e, 'slug', slugify(get(e, 'name'))),
    type: get(e, 'type'),
    uuid: generateUuid(),
    name: get(e, 'name'),
    entity: get(e, 'entity'),
    metadata: get(e, 'metadata'),
    links: get(e, 'links'),
    exec_date: now.date,
    exec_time: now.time,
    languages: languageCodes,
    frequency,
    username
  }, isUndefined)
}

/**
 * Create `merge entity` payloads from `create resource` payload.
 *
 * @param {object} payload object satisfying `api/management/create_resource/payload.json`
 *                         JSON schema.
 * @param {string} resourceUuid UUID of resource these entities should be linked to
 * @param {string} username optional username of resource creator.
 *
 * @returns {array} a list of objects satisfying `mutations/merge_entity.json` JSON schema
 */
function createResourcePayloadToMergeEntityList(payload, resourceUuid, username) {
  const validatedInput = validated(payload, 'api/management/create_resource/payload.json')
  const entities = get(validatedInput, 'entities', [])
  const entitiesLocations = get(validatedInput, 'entitiesLocations', [])
  const entitiesLocationsByEntityIndex = groupBy(entitiesLocations, 'entityIndex')

  const languageCodesByEntityIndex = mapValues(entitiesLocationsByEntityIndex,
    items => uniq(items.map(v => v.languageCode)))
  const frequencyByEntityIndex = mapValues(entitiesLocationsByEntityIndex,
    items => items.length)

  const now = getNowTime()

  return entities
    .map((e, index) => entityFromPayloadToMergeEntity(
      e, resourceUuid, now,
      languageCodesByEntityIndex[index],
      frequencyByEntityIndex[index],
      username
    ))
    .map(e => validated(e, 'mutations/merge_entity.json'))
}

function entitiesContext(locations, entities) {
  return locations.map(location => {
    const id = get(get(entities, location.entityIndex), 'uuid')
    const context = {
      left: location.leftOffset,
      right: location.rightOffset
    }

    return { id, context }
  })
}

function mergeVersionFromEntity(languageCode, entities, locations, resourceId, now) {
  const firstEntityIndex = get(locations, '0.entityIndex')
  const firstEntity = get(entities, firstEntityIndex)

  return omitBy({
    resource_id: resourceId,
    service: get(firstEntity, 'entity.ned_model', 'unknown'),
    language: languageCode,
    yaml: YAML.stringify(entitiesContext(locations, entities)),
    creation_date: now.date,
    creation_time: now.time
  }, isUndefined)
}

/**
 * Create `merge relationship resource version` payloads from `create resource` payload.
 *
 * These payloads link a group of entities in the same language to locations in resource text.
 *
 * @param {object} payload object satisfying `api/management/create_resource/payload.json`
 *                         JSON schema.
 * @param {array} entities a list of objects satisfying `mutations/merge_entity.json` schema
 * @param {string} resourceId Neo4j ID of the resource (NOT the `uuid`!)
 *
 * @returns {array} a list of objects satisfying
 *                  `mutations/merge_relationship_resource_version.json`
 */
function createResourcePayloadToMergeRelationshipResourceVersionList(
  payload, entities, resourceId
) {
  const validatedInput = validated(payload, 'api/management/create_resource/payload.json')
  const entitiesLocations = get(validatedInput, 'entitiesLocations', [])
  const entitiesLocationsByLanguageCode = groupBy(entitiesLocations, 'languageCode')

  const now = getNowTime()

  return Object.keys(entitiesLocationsByLanguageCode)
    .map(languageCode => {
      const locations = entitiesLocationsByLanguageCode[languageCode]

      return mergeVersionFromEntity(
        languageCode, entities, locations, resourceId, now
      )
    })
    .map(e => validated(e, 'mutations/merge_relationship_resource_version.json'))
}

module.exports = {
  createResourcePayloadToMergeEntityList,
  createResourcePayloadToMergeRelationshipResourceVersionList
}
