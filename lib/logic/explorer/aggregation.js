// @ts-check
const {
  first, last,
  flattenDepth, sum
} = require('lodash')

const BinsAllocationMethod = Object.freeze({
  count: 'count',
  month: 'month',
  year: 'year'
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

/**
 * @typedef {object} AggregationItem
 * @property {any} aggregationKey
 * @property {string} firstResourceUuid
 * @property {string} lastResourceUuid
 * @property {string} minStartDate
 * @property {string} maxStartDate
 * @property {number} totalResources
 * @property {any} aggregatable
 */

const getTimeResourceFilter = (fromTime = undefined, toTime = undefined) => {
  const fromFilter = fromTime === undefined ? '' : 'res.start_time >= {fromTime} AND'
  const toFilter = toTime === undefined ? '' : 'res.start_time <= {toTime} AND'
  return [fromFilter, toFilter].join(' ')
}

const resampleByYear = items => {
  const itemsByYear = items.reduce((acc, item) => {
    const year = parseInt(parseInt(item.aggregationKey, 10).toString().slice(0, 4), 10)
    acc[year] = acc[year] || []
    acc[year].push(item)
    return acc
  }, {})
  return Object.keys(itemsByYear).sort()
    .map(year => {
      const yearItems = itemsByYear[year]
      return {
        firstResourceUuid: first(yearItems).firstResourceUuid,
        lastResourceUuid: last(yearItems).lastResourceUuid,
        minStartDate: first(yearItems).minStartDate,
        maxStartDate: last(yearItems).maxStartDate,
        aggregationKey: year,
        aggregatable: flattenDepth(yearItems.map(({ aggregatable }) => aggregatable), 1),
        totalResources: sum(yearItems.map(({ totalResources }) => totalResources))
      }
    })
}

const postAggregateResults = (results, method) => {
  if (method === BinsAllocationMethod.year) {
    return resampleByYear(results)
  }
  return results
}

module.exports = {
  getAggregationQuery,
  getTimeResourceFilter,
  BinsAllocationMethod,
  postAggregateResults
}
