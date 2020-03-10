const {
  get, uniq, groupBy, mapValues,
  isUndefined, omitBy
} = require('lodash')
const { validated } = require('../../util/json')

const { slugify, generateUuid } = require('../../util/text')

function createContext(languageCodes, entitiesLocations) {
  return languageCodes.reduce((context, languageCode) => {
    // eslint-disable-next-line no-param-reassign
    context[languageCode] = entitiesLocations
      .filter(location => location.languageCode === languageCode)
      .map(({ leftOffset, rightOffset }) => [leftOffset, rightOffset])
    return context
  }, {})
}

function entityFromPayloadToEntityAndAppearance(e, languageCodes, entitiesLocations) {
  const type = get(e, 'type')
  const entity = omitBy({
    slug: get(e, 'slug', slugify(get(e, 'name'))),
    uuid: generateUuid(),
    name: get(e, 'name'),
    entity: get(e, 'entity'),
    metadata: get(e, 'metadata'),
    links: get(e, 'links'),
    first_name: get(e, 'first_name'),
    last_name: get(e, 'last_name'),
    lat: get(e, 'lat'),
    lng: get(e, 'lng'),
    country: get(e, 'country'),
    geoname_id: get(e, 'geoname_id'),
    geocoding_id: get(e, 'geocoding_id'),
  }, isUndefined)

  const frequency = entitiesLocations.length
  const context = createContext(languageCodes, entitiesLocations)

  const appearance = omitBy({
    frequency,
    languages: languageCodes,
    context
  }, isUndefined)

  return { entity, appearance, type }
}

/**
 * Create `merge entity` payloads from `create resource` payload.
 *
 * @param {object} payload object satisfying `api/management/create_resource/payload.json`
 *                         JSON schema.
 *
 * @returns {array} a list of objects { entity, appearance, type } where
 *                  `entity` satisfies `db/entity.json` JSON schema,
 *                  `appearance` satisfies `db/appears_in.json` JSON schema,
 *                  `type` is a type string.
 */
function createResourcePayloadToEntityAndAppearanceList(payload) {
  const validatedInput = validated(payload, 'api/management/create_resource/payload.json')
  const entities = get(validatedInput, 'entities', [])
  const entitiesLocations = get(validatedInput, 'entitiesLocations', [])
  const entitiesLocationsByEntityIndex = groupBy(entitiesLocations, 'entityIndex')

  const languageCodesByEntityIndex = mapValues(entitiesLocationsByEntityIndex,
    items => uniq(items.map(v => v.languageCode)))

  return entities
    .map((e, index) => entityFromPayloadToEntityAndAppearance(
      e,
      languageCodesByEntityIndex[index] || ['en'],
      entitiesLocationsByEntityIndex[index] || []
    ))
    .filter(({ entity }) => entity.slug !== '')
    .map(({ entity, appearance, type }) => ({
      entity: validated(entity, 'db/entity.json'),
      appearance: validated(appearance, 'db/appears_in.json'),
      type
    }))
}

module.exports = {
  createResourcePayloadToEntityAndAppearanceList
}
