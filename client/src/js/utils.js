import {
  get, identity, isUndefined,
  assignIn, isString, isEmpty,
  isArray, clone, includes,
  concat, uniq, isNil
} from 'lodash'

import lucene from 'lucene'

// eslint-disable-next-line import/prefer-default-export
export function bindStateChangeToObject($scope, $location, objectName, parameters) {
  const locationChangeHandler = () => {
    const searchParams = $location.search()
    const newObject = parameters.reduce((acc, p) => {
      const params = isString(p) ? [p] : p
      const urlParameterName = get(params, 0)
      const objectParameterName = get(params, 1, urlParameterName)
      const defaultValue = get(params, 2, undefined)
      const deserialize = get(params, 4, identity)

      const serializedValue = get(searchParams, urlParameterName)
      // eslint-disable-next-line no-param-reassign
      acc[objectParameterName] = isUndefined(serializedValue)
        ? defaultValue : deserialize(serializedValue)
      return acc
    }, {})
    $scope[objectName] = newObject
  }
  $scope.$on('$locationChangeSuccess', locationChangeHandler)

  $scope.$watch(objectName, obj => {
    const newSearchParams = parameters.reduce((acc, p) => {
      const params = isString(p) ? [p] : p
      const urlParameterName = get(params, 0)
      const objectParameterName = get(params, 1, urlParameterName)
      const defaultValue = get(params, 2, undefined)
      const serialize = get(params, 3, identity)

      const value = get(obj, objectParameterName, defaultValue)

      if (value !== defaultValue) {
        // eslint-disable-next-line no-param-reassign
        acc[urlParameterName] = serialize(value)
      }
      return acc
    }, {})

    $location.search(assignIn({}, $location.search(), newSearchParams))
  }, true)
  locationChangeHandler()
}

export function serializeStringList(l) {
  if (isEmpty(l)) return ''
  return l.map(encodeURIComponent).join(',')
}

export function deserializeStringList(l) {
  if (isEmpty(l)) return []
  return l.split(',').map(encodeURIComponent)
}

export function prepareApiQueryParameters(obj) {
  return Object.keys(obj).reduce((acc, key) => {
    let value = obj[key]
    if (isUndefined(value)) return acc
    if (!isArray(value)) value = [value]
    value = value.map(item => (isString(item) ? encodeURIComponent(item) : item)).join(',')
    // eslint-disable-next-line no-param-reassign
    acc[key] = value
    return acc
  }, {})
}

export function proxyWithPreparedApiQueryParameters(resource, method, args) {
  const argsCopy = clone(args)
  const params = args[0]
  argsCopy[0] = prepareApiQueryParameters(params)
  return resource[method](...argsCopy)
}

function luceneResultToPropertyList(result, property, items = []) {
  const keys = Object.keys(result || {});
  if (includes(keys, 'left') && includes(keys, 'right') && includes(keys, 'operator')) {
    let keywords = luceneResultToPropertyList(result.left, property, items)
    keywords = luceneResultToPropertyList(result.right, property, keywords)
    return keywords
  }
  const value = result[property]
  if (isNil(value)) return items
  return concat(items, value)
}

function luceneResultToOperatorsList(result, items = []) {
  const keys = Object.keys(result || {});
  if (includes(keys, 'left') && includes(keys, 'right') && includes(keys, 'operator')) {
    let operators = concat(items, result.operator)
    operators = luceneResultToOperatorsList(result.left, operators)
    operators = luceneResultToOperatorsList(result.right, operators)
    return operators
  }
  return items
}

export function parseSolrQuery(str) {
  const parseResult = lucene.parse(str)
  const keywords = luceneResultToPropertyList(parseResult, 'term')
  const operators = uniq(luceneResultToOperatorsList(parseResult))

  if (operators.length > 1) throw new Error(`Solr query "${str}" contains more than one operator: "${operators}"`)

  return [
    keywords,
    operators.length > 0 ? operators[0] : 'AND'
  ]
}

const spaceRegex = /\s/

export function formatSolrQuery(items, operator) {
  return items
    .map(item => (item.match(spaceRegex) ? `"${item}"` : item))
    .join(` ${operator} `)
}
