const {
  get, isString, first,
  values, groupBy, toPairs,
  uniq, chain, flatten,
  isUndefined, omitBy
} = require('lodash')
const YAML = require('yamljs')
const { slugify, generateUuid } = require('../../util/text')
const { validated } = require('../../util/json')

const TypeMapping = {
  LOC: 'location',
  PER: 'person',
  ORG: 'organization',
  UNK: 'organization'
}

const UniqueEntityFields = [
  'wikidata_id',
  'dbpedia_uri',
  'google_kg_id',
  'viaf_id'
]

const LinksFields = [
  'wikidata_id',
  'dbpedia_uri',
  'google_kg_id',
  'wikipedia_uri',
  'viaf_id',
  'external_url'
]

/**
 * C2DH Nerd entities do not have an ID but we know
 * that disambiguated entities have third party IDs that
 * uniquely identify them.
 *
 * If no such IDs are provided with the entity we can
 * use 'label'.
 * @param {C2dhEntity} entity
 * @return {string}
 */
function getEntityId(entity) {
  const ids = UniqueEntityFields
    .map(f => get(entity, `matched_resource.${f}`))
    .filter(isString)
  return first(ids) || get(entity, 'matched_resource.label')
}

/**
 *
 * @param {array} pairs a list of: [<language_code>, <entity>] where
 * the whole list is one resolved entity.
 * @return {Entity} a histograph entity ready to be saved in the DB.
 */
function c2dhNerLanguageAndEntityPairsToToEntityAndAppearance(pairs, services) {
  if (pairs.length === 0) return undefined

  const languages = uniq(pairs.map(([lang]) => lang))
  const [, firstEntity] = first(pairs)
  const matchedResource = firstEntity.matched_resource

  // TODO: Taking label of the first entity which may not be
  // the best thing in case of a multi language entity.
  const name = get(matchedResource, 'label') || get(firstEntity, 'entity')
  const description = get(matchedResource, 'description') || undefined

  const entityModel = get(matchedResource, 'model')
  const entityId = get(matchedResource, 'id')

  const context = toPairs(groupBy(pairs, ([lang]) => lang))
    .reduce((acc, [language, groupPairs]) => {
      const languageContext = groupPairs.map(([, entity]) => [entity.left, entity.right])
      acc[language] = languageContext
      return acc
    }, {})

  const links = LinksFields.reduce((acc, fieldName) => {
    const value = get(matchedResource, fieldName)
    if (isString(value)) {
      acc[fieldName] = value
    }
    return acc
  }, {})

  const type = TypeMapping[get(matchedResource, 'tag')]

  const entity = omitBy({
    slug: slugify(name),
    uuid: generateUuid(),
    name,
    entity: {
      ned_model: entityModel,
      ned_id: entityId
    },
    links,
    description,
    metadata: get(matchedResource, 'metadata', undefined),
  }, isUndefined)

  const appearance = omitBy({
    frequency: pairs.length,
    languages,
    context,
    services
  }, isUndefined)

  return { entity, appearance, type }
}

/**
 * Create `merge entity` payloads from `C2DH Nerd` response.
 *
 * @param {array} languageAndEntityPairs an array of:
 * ['<lang-code>', '<c2dh-nerd-entity>']
 * @param {array} services an optional array of services used to discover these entities.
 *
 * @returns {array} a list of objects { entity, appearance, type } where
 *                  `entity` satisfies `db/entity.json` JSON schema,
 *                  `appearance` satisfies `db/appears_in.json` JSON schema,
 *                  `type` is a type string.
 */
function c2dhNerdResultToEntityAndAppearanceList(languageAndEntityPairs, services) {
  const grouper = ([, entity]) => getEntityId(entity)
  const languageAndEntityPairsGroups = values(groupBy(languageAndEntityPairs, grouper))

  return languageAndEntityPairsGroups
    .map(pairs => c2dhNerLanguageAndEntityPairsToToEntityAndAppearance(pairs, services))
    .map(({ entity, appearance, type }) => ({
      entity: validated(entity, 'db/entity.json'),
      appearance: validated(appearance, 'db/appears_in.json'),
      type
    }))
}

module.exports = {
  c2dhNerdResultToEntityAndAppearanceList
}
