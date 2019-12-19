const axios = require('axios')
const {
  get, last, values, isString,
  fromPairs
} = require('lodash')
const wdk = require('wikidata-sdk')
const { executeQuery } = require('../../util/neo4j')
const { fromNeo4jJson } = require('../../converters/db')

const QueryGetEntity = 'MATCH (e:entity {uuid: $id}) RETURN e'

const SupportedLanguageCodes = ['en', 'fr', 'de', 'it', 'nl', 'lu']

const getWikidataLinkFromWikipedia = entity => [get(entity, 'links.wikipedia_uri')]
  .filter(isString)
  .map(link => last(link.split('/')))
  .map(pageName => wdk.getEntitiesFromSitelinks(pageName))[0]

function getWikidataLinkFromEntityName(entity) {
  const name = get(entity, 'name')
  return wdk.getEntitiesFromSitelinks(name)
}

const WikidataLinkExtractors = [
  { extractor: getWikidataLinkFromWikipedia, trusted: true },
  { extractor: getWikidataLinkFromEntityName, trusted: false }
]

function getWikidataLink(entity) {
  return WikidataLinkExtractors.reduce((link, { extractor, trusted }) => {
    if (link.link !== undefined) return link
    return { link: extractor(entity), trusted }
  }, { link: undefined, trusted: false })
}

async function getWikidataEntry(entity) {
  const { link, trusted } = getWikidataLink(entity)
  if (!link) return { entry: undefined, trusted: false }
  const result = await axios.get(link)
  return { entry: result.data, trusted }
}

const getWikidataEntityType = entity => {
  const code = get(entity.claims, 'P31.0.mainsnak.datavalue.value.id')
  if (code === 'Q5') return 'human'
  const location = get(entity.claims, 'P625')
  if (location !== undefined) return 'location'
  return undefined
}

const getWikipediaLink = entity => {
  const sitelink = get(entity.sitelinks, 'enwiki') || values(entity.sitelinks)[0]
  return !sitelink
    ? undefined
    : `https://${sitelink.site.replace(/wiki$/, '')}.wikipedia.org/wiki/${sitelink.title}`
}

const getThumbnailUrl = entity => {
  const imageNames = get(entity, 'claims.P18', [])
    .map(entry => get(entry, 'mainsnak.datavalue.value'))
    .filter(isString)

  return imageNames.length === 0
    ? undefined
    : `http://commons.wikimedia.org/wiki/Special:FilePath/${imageNames[0]}?width=80px`
}

const getMultilanguageField = field => {
  const pairs = SupportedLanguageCodes
    .map(languageCode => [languageCode, get(field, `${languageCode}.value`)])
    .filter(([, value]) => value !== undefined)
  return fromPairs(pairs)
}

const getDate = (entity, id) => [get(entity, `claims.${id}.0.mainsnak.datavalue.value.time`)]
  .filter(isString)
  .map(date => date.replace(/^\+/, ''))[0]

const getCoordinates = entity => {
  const coordinates = get(entity, 'claims.P625.0.mainsnak.datavalue.value')
  if (!coordinates) return undefined
  return {
    lat: coordinates.latitude,
    lon: coordinates.longitude
  }
}

const wikidataEntityToPlaceDescription = entity => ({
  label: getMultilanguageField(entity.labels),
  description: getMultilanguageField(entity.descriptions),
  coordinates: getCoordinates(entity)
})

const getPlace = async (entity, typeId) => {
  const placeId = get(entity, `claims.${typeId}.0.mainsnak.datavalue.value.id`)
  if (!placeId) return undefined
  const link = wdk.getEntities(placeId)
  const result = await axios.get(link)
  const wikidataEntity = get(result.data, `entities.${placeId}`)
  return wikidataEntityToPlaceDescription(wikidataEntity)
}

const DatePlaceIds = {
  birth: ['P569', 'P19'],
  death: ['P570', 'P20']
}

const getBirthOrDeath = async (entity, type) => {
  const [dateId, placeId] = DatePlaceIds[type]
  return {
    date: getDate(entity, dateId),
    place: await getPlace(entity, placeId)
  }
}

const getBirth = async entity => getBirthOrDeath(entity, 'birth')
const getDeath = async entity => getBirthOrDeath(entity, 'death')

async function wikdataEntryToMetadata(entry, entity, trusted) {
  const entitiesIds = Object.keys(get(entry, 'entities', {}))
  if (entitiesIds.length === 0 || (entitiesIds.length === 1 && entitiesIds[0] === '-1')) return {}
  const isAmbiguousMatch = !trusted || entitiesIds.length > 1

  const entityId = entitiesIds[0]
  const wikidataEntity = get(entry.entities, entityId)
  if (!wikidataEntity) return {}

  const externalLinks = [
    {
      label: 'Wikidata',
      url: `https://www.wikidata.org/wiki/${entityId}`
    }
  ]
  const wikipediaLink = getWikipediaLink(wikidataEntity)
  if (wikipediaLink) externalLinks.push({ label: 'Wikipedia', url: wikipediaLink })

  return {
    type: getWikidataEntityType(wikidataEntity),
    isAmbiguousMatch,
    externalLinks,
    thumbnailUrl: getThumbnailUrl(wikidataEntity),
    description: getMultilanguageField(wikidataEntity.descriptions),
    birth: await getBirth(wikidataEntity),
    death: await getDeath(wikidataEntity)
  }
}

async function getEntityMetadata(id) {

  const entity = (await executeQuery(QueryGetEntity, { id })).map(fromNeo4jJson)[0]
  if (!entity) return undefined

  const { entry, trusted } = await getWikidataEntry(entity)
  return wikdataEntryToMetadata(entry, entity, trusted)
}

module.exports = {
  getEntityMetadata
}
