const {
  get, includes, isString, difference,
  uniq, flatten, sortBy, intersection,
  isEmpty, omitBy, isUndefined
} = require('lodash')
const assert = require('assert')
const moment = require('moment')
const crypto = require('crypto')

const { validated } = require('../../util/json')
const {
  text: { slugify },
  reconcileDate,
  getMonths,
  uuid: generateUuid,
} = require('../../../helpers')

const settings = require('../../../settings')

const AvailableResourceTypes = get(settings, 'types.resources')
const SupportedLanguages = [
  'en', 'es', 'it', 'fr', 'de', 'und'
]

/*
  There are traces of other types in the code but in reality
  only two are supported at the moment: 'image' and 'text'.
*/
const SupportedMimeTypePrefixes = ['image', 'text']
const DefaultMimeType = 'text/plain'
const DefaultType = 'external-text'

function getFieldLanguages(obj, field) {
  const fieldValue = get(obj, field, {})
  const fieldLanguages = Object.keys(fieldValue)
  const unknownLanguages = difference(fieldLanguages, SupportedLanguages)
  assert(unknownLanguages.length === 0, `Not supported languages in "${field}": ${unknownLanguages}`)
  assert(fieldLanguages.length > 0, `At least one language must be provided in "${field}"`)

  return fieldLanguages
}

function isText(mimeType) {
  const [mimeTypePrefix] = mimeType.split('/')
  return mimeTypePrefix === 'text'
}

function generateContentUrl(content, mimeType) {
  const [mimeTypePrefix, mimeTypeSuffix] = mimeType.split('/')
  const fingerprint = crypto.createHash('md5').update(content).digest('hex')
  const extension = mimeTypePrefix === 'text'
    ? 'txt'
    : mimeTypeSuffix

  return `${fingerprint}.${extension}`
}

/**
 * *** DEPRECATED ***
 * Validate and normalize resource properties.
 *
 * @param {object} payload object describing new resource.
 * Used in the API but can be used anywhere.
 * @return {object} object ready to be added to the database
 * using `Resource.create`.
 */
function convertResourcePayloadToNewResourceProperties(payload) {
  const resourceType = get(payload, 'type', '')
  assert(includes(AvailableResourceTypes, resourceType), `Unknown resource type: "${resourceType}". Should be one of: ${AvailableResourceTypes.join(', ')}`)

  const mimeType = get(payload, 'mimetype', DefaultMimeType)
  const mimeTypePrefix = mimeType.split('/')[0]
  assert(includes(SupportedMimeTypePrefixes, mimeTypePrefix), `Mimetype not supported: ${mimeType}. Should start with one of: ${SupportedMimeTypePrefixes.join(', ')}`)

  const startDate = get(payload, 'start_date', '')
  assert(moment(startDate).isValid(), `Invalid "start_date": ${startDate}`)

  const endDate = get(payload, 'end_date', '')
  assert(moment(endDate).isValid(), `Invalid "end_date": ${endDate}`)

  // TODO: generate slug from title
  const slug = get(payload, 'slug')
  assert(isString(slug), 'Slug string is required')

  const titleLanguages = getFieldLanguages(payload, 'title')
  const captionLanguages = getFieldLanguages(payload, 'caption')
  const contentLanguages = getFieldLanguages(payload, 'content')
  const languages = uniq(flatten([titleLanguages, captionLanguages, contentLanguages]))

  const fallbackName = flatten(['en'], titleLanguages)
    .reduce((title, languageCode) => title || get(payload.title, languageCode), null)

  const resourceProperties = {
    mimetype: mimeTypePrefix, // NOTE: it is actually the prefix.
    full_mimetype: mimeType,
    type: resourceType,
    slug,
    languages,
    start_date: startDate,
    end_date: endDate,
    name: get(payload, 'name', fallbackName),
    previous_resource_uuid: get(payload, 'previous_resource_uuid'),
  }

  const indexContent = get(payload, 'index_content', false)

  titleLanguages.forEach(languageCode => {
    resourceProperties[`title_${languageCode}`] = get(payload.title, languageCode)
  })
  captionLanguages.forEach(languageCode => {
    resourceProperties[`caption_${languageCode}`] = get(payload.caption, languageCode)
  })
  contentLanguages.forEach(languageCode => {
    resourceProperties[`url_${languageCode}`] = generateContentUrl(get(payload.content, languageCode), mimeType)
    if (indexContent && isText(mimeType)) {
      resourceProperties[`content_${languageCode}`] = get(payload.content, languageCode)
    }
  })

  if (get(payload, 'iiif_url')) {
    resourceProperties.iiif_url = get(payload, 'iiif_url')
  }

  return resourceProperties
}

/**
 * Create `merge resource` payload from `create resource` payload.
 *
 * @param {object} payload object satisfying `api/management/create_resource/payload.json`
 *                         JSON schema.
 * @param {string} username optional username of resource creator.
 *
 * @return {object} object satisfying `db/resource.json` JSON schema
 */
function createResourcePayloadToResource(payload) {
  const validatedInput = validated(payload, 'api/management/create_resource/payload.json')
  const resource = get(validatedInput, 'resource')

  const titleLanguages = sortBy(Object.keys(get(resource, 'title')))
  const captionLanguages = sortBy(Object.keys(get(resource, 'caption')))
  const contentLanguages = sortBy(Object.keys(get(resource, 'content')))
  const languages = uniq(flatten([titleLanguages, captionLanguages, contentLanguages]))

  const matchedLanguages = intersection(titleLanguages, captionLanguages, contentLanguages)
  const unmatchedLanguages = difference(languages, matchedLanguages)
  assert(isEmpty(unmatchedLanguages), `Some languages are not matched in title/caption/content: ${unmatchedLanguages.join(', ')}`)
  assert(!isEmpty(languages), 'At least one language must be provided')

  const defaultTitle = get(resource, 'title.en', get(resource, `title.${languages[0]}`))
  const slug = get(resource, 'slug', slugify(defaultTitle))

  const type = get(resource, 'type', DefaultType)
  const mimeType = get(resource, 'mimetype', DefaultMimeType)

  /* eslint-disable camelcase */
  const {
    date: start_date,
    time: start_time,
  } = reconcileDate(get(resource, 'start_date'))

  const {
    date: end_date,
    time: end_time,
  } = reconcileDate(get(resource, 'end_date'))

  const {
    start_month,
    start_year,
    end_month,
    end_year,
  } = getMonths(start_time, end_time)
  /* eslint-enable camelcase */

  const mergeResourceObject = omitBy({
    slug,
    uuid: generateUuid(),
    name: defaultTitle,
    mimetype: mimeType,
    languages,
    start_time,
    start_date,
    start_month: parseInt(start_month, 10),
    start_year: parseInt(start_year, 10),
    end_time,
    end_date,
    end_month: parseInt(end_month, 10),
    end_year: parseInt(end_year, 10),
    title: get(resource, 'title'),
    caption: get(resource, 'caption'),
    content: get(resource, 'content'),
    type,
    iiif_url: get(resource, 'iiif_url'),
  }, isUndefined)

  return validated(mergeResourceObject, 'db/resource.json')
}

module.exports = {
  convertResourcePayloadToNewResourceProperties,
  createResourcePayloadToResource
}
