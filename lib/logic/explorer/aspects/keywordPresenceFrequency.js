// @ts-check

/**
 * Frequency of a keyword being mentioned in resources. If a keyword
 * is mentioned more than once in a resource it is counted as one mention
 * due to limitations of Neo4j DB.
 */
const {
  isString, omit, isArray,
  sum, flatten
} = require('lodash')
const { executeQuery } = require('../../../util/neo4j')
const { toUnixSeconds } = require('../../../util/date')
const {
  getAggregationQuery,
  getTimeResourceFilter,
  BinsAllocationMethod,
  postAggregateResults
} = require('../aggregation')

const idsProducer = /* cypher */ `
CALL db.index.fulltext.queryNodes({fullTextIndex}, {searchTerm})
YIELD node AS r
WITH collect(r.uuid) AS ids
`

const equalBucketAggregationBucketProducer = maxBucketSize => /* cypher */ `
WITH 
  collect(res) AS items,
  ids
WITH
  items,
  ids,
  floor(size(items) / ${maxBucketSize}) AS step
WITH
    items,
    ids,
    toInteger(head([a in [step,1] where a > 0])) as step
UNWIND range(0, size(items), step) AS i
WITH
  items[i..i+step] AS bucket,
  i AS aggregationKey,
  ids
WITH
  bucket,
  aggregationKey,
  size([i in bucket where i.uuid in ids]) AS aggregatable
`

const monthAggregationBucketProducer = /* cypher */ `
WITH
  res.start_month AS aggregationKey,
  collect(res) AS bucket,
  ids
WITH
  size([i in bucket where i.uuid in ids]) AS aggregatable,
  bucket,
  aggregationKey
`

const getQuery = (bucketProducer, fromTime, toTime) => getAggregationQuery(
  idsProducer,
  getTimeResourceFilter(fromTime, toTime),
  bucketProducer
)

const getDateAggregationQuery = (fromTime, toTime) => getQuery(
  monthAggregationBucketProducer,
  fromTime,
  toTime
)

const getCountAggregationQuery = (bucketSize, fromTime, toTime) => getQuery(
  equalBucketAggregationBucketProducer(bucketSize),
  fromTime,
  toTime
)

function parseDataParameters(parameters = {}) {
  const {
    bins, from, to, keyword, language, method
  } = parameters
  return {
    fromTime: isString(from) ? toUnixSeconds(from) : undefined,
    toTime: isString(to) ? toUnixSeconds(to, true) : undefined,
    bins: isString(bins) ? parseInt(bins, 10) : undefined,
    keyword,
    languageCode: language,
    method
  }
}

async function getConfiguration() {
  return {
    type: 'bar',
    label: 'Keyword mentions',
    aspect: 'keywordPresenceFrequency'
  }
}

async function getFilters() {
  return [
    {
      type: 'solr-keywords',
      label: 'Keyword',
      key: 'keyword',
    }
  ]
}

async function getResources(method, searchTerm, languageCode = 'en', bins, fromTime, toTime) {
  const fullTextIndex = `text_${languageCode}`
  const params = {
    fromTime,
    toTime,
    searchTerm,
    fullTextIndex
  }
  const query = method === BinsAllocationMethod.count
    ? getCountAggregationQuery(bins, fromTime, toTime)
    : getDateAggregationQuery(fromTime, toTime)
  const results = await executeQuery(query, params)
  return postAggregateResults(results, method)
}

async function getData(parameters = {}) {
  const {
    bins, fromTime,
    toTime, keyword,
    languageCode, method
  } = parseDataParameters(parameters)

  const resultItems = keyword
    ? await getResources(method, keyword, languageCode, bins, fromTime, toTime)
    : []

  const data = resultItems.map(({ aggregatable }) => sum(flatten([aggregatable])))
  const meta = resultItems.map(i => omit(i, ['aggregationKey', 'aggregatable']))

  const labels = keyword ? [keyword] : []

  return {
    data: data.map(item => (isArray(item) ? item : [item])),
    meta,
    labels
  }
}

module.exports = {
  getConfiguration,
  getFilters,
  getData,
  getDateAggregationQuery,
  getCountAggregationQuery
}
