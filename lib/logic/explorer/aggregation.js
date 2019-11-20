const assert = require('assert')
const {
  isEmpty, isNil, isNumber, chunk,
  first, last, isArray, range, get
} = require('lodash')

const BinsAllocationMethod = Object.freeze({
  count: Symbol('count'),
  month: Symbol('month'),
  year: Symbol('year')
})

/**
 * @param {string} idsProducer a section of query that produces
 *                 the following variables: ids
 *                 The `ids` variable can be used in `bucketProducer`.
 * @param {string} resourceFilter a `WHERE` section of query used to filter resource
 * @param {string} bucketProducer a section of query that produces
 *                 the following variables: bucket, aggregationKey, aggregatable
 *                 The `bucket` variable is a list of `resource` entities.
 *                 The `aggregationKey` is the aggregation variable used to
 *                 create the bucket (e.g. bucket index or year).
 *                 The `aggregatable` is the variable that contains all data
 *                 needed to produce aggregated result.
 * @returns {string} query
 */
const getAggregationQuery = (idsProducer, resourceFilter, bucketProducer) => `
${idsProducer}
MATCH (res:resource)
WHERE
  ${resourceFilter}
  true
WITH res, ids
ORDER BY res.start_time ASC
${bucketProducer}
RETURN
  aggregationKey,
  head(bucket).uuid as firstResourceUuid,
  last(bucket).uuid as lastResourceUuid,
  size(bucket) as totalResources,
  head(bucket).start_date AS minStartDate,
  last(bucket).start_date AS maxStartDate,
  aggregatable
`

const getTimeResourceFilter = (fromTime = undefined, toTime = undefined) => {
  const fromFilter = fromTime === undefined ? '' : 'res.start_time >= {fromTime} AND'
  const toFilter = toTime === undefined ? '' : 'res.start_time <= {toTime} AND'
  return [fromFilter, toFilter].join(' ')
}

const postAggregateResults = (results, method) => {
  if (method === BinsAllocationMethod.month) {
    // todo
  }
  if (method === BinsAllocationMethod.year) {
    // todo
  }
  return results
}

function aggregateArrays(values, fn) {
  const arrayLength = first(values).length
  return range(0, arrayLength).map(i => {
    const vector = values.map(v => get(v, i, undefined))
    return fn(vector)
  })
}

function aggregateScalars(values, fn) {
  return fn(values)
}

/**
 *
 * @param {array} items a list of items to aggregate
 * @param {*} binsCount aggregate items into this number of bins
 * @param {*} valueFn function applied to every item to extract value to be aggregated.
 *                    Value can be an array.
 * @param {*} aggregationFn function to aggregate values (e.g. mean or max)
 * @return a list of aggregated items:
 * {
 *    firstItem: <first item from the items list>,
 *    lastItem: <last item from the items list>,
 *    value: <aggregated value>,
 *    itemsCount: N
 * }
 */
function aggregate(items, binsCount, valueFn, aggregationFn) {
  if (isEmpty(items)) return []

  let finalBinsCount = isNil(binsCount)
    ? items.length
    : binsCount
  finalBinsCount = isNil(binsCount) || binsCount > items.length
    ? items.length
    : binsCount
  assert(isNumber(finalBinsCount), `Bins count must be a number: ${binsCount}`)

  const itemsCountPerBin = Math.ceil(items.length / finalBinsCount)
  const chunkedItems = chunk(items, itemsCountPerBin)

  return chunkedItems.map(binItems => {
    const [firstItem, lastItem] = [first(binItems), last(binItems)]
    const values = binItems.map(valueFn)

    const value = isArray(first(values))
      ? aggregateArrays(values, aggregationFn)
      : aggregateScalars(values, aggregationFn)

    return {
      firstItem,
      lastItem,
      value,
      itemsCount: values.length
    }
  })
}

module.exports = {
  aggregate,
  getAggregationQuery,
  getTimeResourceFilter,
  BinsAllocationMethod,
  postAggregateResults
}
