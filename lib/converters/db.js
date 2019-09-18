const {
  get, isPlainObject, assignIn,
  isEmpty, set, toPairs, first
} = require('lodash')

const DefaultNeo4jPathSeparator = '__'

function _valueToNeo4jObject(prefix, value, options = {}) {
  const separator = get(options, `separators.${prefix}`, DefaultNeo4jPathSeparator)

  if (isPlainObject(value)) {
    return Object.keys(value).reduce((acc, k) => {
      const keyPrefix = isEmpty(prefix) ? k : `${prefix}${separator}${k}`
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

  Object.keys(obj).forEach(key => {
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

const toNeo4jResource = r => toNeo4jJson(r, { separators: ResourceSeparators })

module.exports = {
  toNeo4jJson, fromNeo4jJson, toNeo4jResource
}
