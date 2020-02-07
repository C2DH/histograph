// @ts-check
const {
  isString, includes,
  isArray, omit
} = require('lodash')
const decypher = require('decypher')
const { prepareQuery, executeQuery } = require('../../../util/neo4j')
const { toUnixSeconds } = require('../../../util/date')
const {
  getAggregationQuery,
  getTimeResourceFilter,
  BinsAllocationMethod,
  postAggregateResults
} = require('../aggregation')

const entityQueries = decypher('./queries/entity.cyp')

const idsProducer = 'WITH null AS ids'

const equalBucketAggregationBucketProducer = maxBucketSize => `
WITH 
  collect(res) AS items
WITH
  items,
  toInteger(floor(size(items) / ${maxBucketSize})) AS step
UNWIND range(0, size(items), max([step, 1])) AS i
WITH
  items[i..i+step] AS bucket,
  [i in items[i..i+step] | i.uuid] AS bucketIds,
  i AS aggregationKey
OPTIONAL MATCH (r:resource)-[]-(e:entity:person)
WHERE r.uuid in bucketIds
WITH
  bucket,
  aggregationKey,
  [i in collect(e) where i.metadata__nationality is not null | i.metadata__nationality] AS aggregatable
`

const monthAggregationBucketProducer = `
WITH
  res.start_month AS aggregationKey,
  collect(res) AS bucket,
  [i in collect(res) | i.uuid] AS bucketIds
OPTIONAL MATCH (r:resource)-[]-(e:entity:person)
WHERE r.uuid in bucketIds
WITH
  aggregationKey,
  bucket,
  [i in collect(e) where i.metadata__nationality is not null | i.metadata__nationality] AS aggregatable
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
    bins, from, to, excludingNationalities, method
  } = parameters
  return {
    fromTime: isString(from) ? toUnixSeconds(from) : undefined,
    toTime: isString(to) ? toUnixSeconds(to, true) : undefined,
    bins: isString(bins) ? parseInt(bins, 10) : undefined,
    excludingNationalities: excludingNationalities || [],
    method
  }
}

async function getConfiguration() {
  return {
    type: 'bar',
    label: 'Persons',
    aspect: 'nationalsMentionFrequency'
  }
}

async function getFilters() {
  const query = prepareQuery(entityQueries.get_unique_field_values, {
    field_name: 'metadata__nationality',
    type: 'person'
  })

  const values = await executeQuery(query)
  return [
    {
      type: 'multi-selection',
      label: 'Excluding nationals of',
      key: 'excludingNationalities',
      values
    }
  ]
}

async function getResources(method, bins, fromTime, toTime) {
  const params = {
    fromTime,
    toTime
  }
  const query = method === BinsAllocationMethod.count
    ? getCountAggregationQuery(bins, fromTime, toTime)
    : getDateAggregationQuery(fromTime, toTime)
  const results = await executeQuery(query, params)
  return postAggregateResults(results, method)
}

const computeAggregatedValue = excludingNationalities => nationalities => {
  if (excludingNationalities.length > 0) {
    const totalNationalities = nationalities.length
    const filteredNationalities = nationalities
      .filter(n => !includes(excludingNationalities, n)).length
    return [filteredNationalities, totalNationalities]
  }
  return nationalities.length
}

async function getData(parameters = {}) {
  const {
    bins, fromTime, toTime,
    excludingNationalities = [],
    method
  } = parseDataParameters(parameters)

  const resultItems = await getResources(method, bins, fromTime, toTime)
  const aggregator = computeAggregatedValue(excludingNationalities)

  const data = resultItems.map(({ aggregatable }) => aggregator(aggregatable))
  const meta = resultItems.map(i => omit(i, ['aggregationKey', 'aggregatable']))

  const labels = excludingNationalities.length > 0
    ? ['Filtered persons', 'All persons']
    : ['Persons']

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
