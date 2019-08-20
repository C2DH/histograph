const {
  get, uniq, groupBy, mapValues,
  isUndefined, omitBy
} = require('lodash')
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

module.exports = {
  createResourcePayloadToMergeEntityList
}
