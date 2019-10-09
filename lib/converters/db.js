const assert = require('assert')
const {
  get, isPlainObject, assignIn,
  isEmpty, set, toPairs, first,
  some, includes, pick, groupBy,
  flatten, uniq, chunk
} = require('lodash')

const DefaultNeo4jPathSeparator = '__'

function _valueToNeo4jObject(prefix, value, options = {}) {
  const separator = get(options, `separators.${prefix}`, DefaultNeo4jPathSeparator)
  const modifiers = get(options, 'modifiers', {})

  if (isPlainObject(value)) {
    return Object.keys(value).reduce((acc, k) => {
      const keyPrefix = isEmpty(prefix) ? k : `${prefix}${separator}${k}`
      const modifier = modifiers[keyPrefix]
      if (modifier !== undefined) {
        const newObj = modifier(keyPrefix, value[k], separator)
        return assignIn(acc, newObj)
      }
      const newObj = _valueToNeo4jObject(keyPrefix, value[k], options)
      return assignIn(acc, newObj)
    }, {})
  }
  return { [prefix]: value }
}

/**
 * Converts any nested JSON to a flat JSON accepted by Neo4j.
 *
 * Neo4j supports flat JSON objects only. Any nested JSON objects need to be
 * flattened before being saved in the database. Flattening is done by concatenating
 * fields in nested objects with a separator. By default the separator is a double
 * underscore (`__`) but it can be overridden by defining the key in `options.separators`.
 *
 * Examples:
 *
 * Input: {'foo': 'bar', 'links': {'a': 'http://a' } }
 * Output: { 'foo': 'bar', 'links__a': 'http://a' }
 *
 * With options = { 'separators': {'links': '_' } }:
 * Output: { 'foo': 'bar', 'links__a': 'http://a' }
 *
 * Custom modifiers:
 * With options = { 'modifiers': { 'links': linksWithMultipleSchemasModifierFn } }
 * Output: { 'foo': 'bar', 'links__a__http': 'http://a', 'links__a__https': 'https://a' }
 * Where `linksWithMultipleSchemasModifierFn` is a modifier function with the following signature:
 * `fn(key, value, separator)` where `key` is the key from modifiers option (`links` in
 * the example above), `value` is the value of the key (`{ 'a': 'http://a' }`) and separator
 * is the standard (or custom) separator for the key.
 *
 * @param {object} nested object
 * @param {object} options optional configuration
 *
 * @returns {object} flat object ready to be used by Neo4j
 */
function toNeo4jJson(obj, options = {}) {
  return _valueToNeo4jObject('', obj, options)
}

function fromNeo4jJson(obj, options = {}) {
  const newObject = {}
  const separatorsPrefixes = toPairs(get(options, 'separators', {}))
  const modifiers = get(options, 'modifiers', {})
  const modifiersKeys = Object.keys(modifiers)

  const objectKeysWithModifiers = Object.keys(obj)
    .filter(k => some(modifiersKeys.map(mk => k.startsWith(mk))))

  const keysByModifierKey = groupBy(
    objectKeysWithModifiers,
    k => first(modifiersKeys.filter(mk => k.startsWith(mk)))
  )

  Object.keys(keysByModifierKey).forEach(modifierKey => {
    const modifier = modifiers[modifierKey]
    const objectKeys = keysByModifierKey[modifierKey]
    const separator = get(options, `separators.${modifierKey}`, DefaultNeo4jPathSeparator)

    const partialNewObject = modifier(modifierKey, pick(obj, objectKeys), separator)
    assignIn(newObject, partialNewObject)
  })

  Object.keys(obj)
    .filter(k => !includes(objectKeysWithModifiers, k))
    .forEach(key => {
      let keyParts = key.split(DefaultNeo4jPathSeparator)
      const firstPart = first(keyParts)
      const indexOfPrefix = first(separatorsPrefixes
        .map(([a, b]) => `${a}${b}`)
        .map((prefix, index) => {
          if (firstPart.startsWith(prefix)) return index
          return -1
        })
        .filter(index => index >= 0))

      if (indexOfPrefix >= 0) {
        const [, separator] = separatorsPrefixes[indexOfPrefix]
        const firstPartParts = firstPart.split(separator)
        keyParts.shift()
        keyParts = firstPartParts.concat(keyParts)
      }

      set(newObject, keyParts.join('.'), obj[key])
    })
  return newObject
}

const ResourceSeparators = {
  title: '_',
  caption: '_',
  content: '_',
  url: '_'
}

const appearsInContextModifierSerializer = (key, contextObject, separator) => Object
  .keys(contextObject)
  .reduce((newObj, languageCode) => {
    const contextPairs = contextObject[languageCode]
    // eslint-disable-next-line no-param-reassign
    newObj[`${key}${separator}${languageCode}`] = flatten(contextPairs)
    return newObj
  }, {})

const appearsInContextModifierDeserializer = (key, contextObject, separator) => {
  const languageCodes = uniq(Object.keys(contextObject)
    .map(k => k.split(separator)[1]))

  const context = languageCodes.reduce((newObj, languageCode) => {
    const flatPairs = contextObject[`${key}${separator}${languageCode}`] || []
    assert(flatPairs.length % 2 === 0, `Number of context pairs should be event but it was ${flatPairs.length}`)
    // eslint-disable-next-line no-param-reassign
    newObj[languageCode] = chunk(flatPairs, 2)
    return newObj
  }, {})

  return { [key]: context }
}

const toNeo4jResource = r => toNeo4jJson(r, { separators: ResourceSeparators })

const toNeo4jAppearance = r => toNeo4jJson(r,
  { modifiers: { context: appearsInContextModifierSerializer } })
const fromNeo4jAppearance = r => fromNeo4jJson(r,
  { modifiers: { context: appearsInContextModifierDeserializer } })

module.exports = {
  toNeo4jJson,
  fromNeo4jJson,
  toNeo4jResource,
  toNeo4jAppearance,
  fromNeo4jAppearance,
}
