const {
  get, difference,
  uniq, flatten, sortBy, intersection,
  isEmpty, omitBy, isUndefined
} = require('lodash')
const assert = require('assert')

const { validated } = require('../../util/json')
const { slugify, generateUuid } = require('../../util/text')
const { reconcileDate, getMonths } = require('../../util/date')

const DefaultMimeType = 'text/plain'
const DefaultType = 'external-text'

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
  createResourcePayloadToResource
}
