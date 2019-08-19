const {
  get, isPlainObject, assignIn, isEmpty
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

module.exports = { toNeo4jJson }
