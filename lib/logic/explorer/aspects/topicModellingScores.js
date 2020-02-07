// @ts-check
const assert = require('assert')
const decypher = require('decypher')
const {
  isString, max,
  mean, sortBy,
  sum, omit,
  range, get
} = require('lodash')
const { executeQuery } = require('../../../util/neo4j')
const { toUnixSeconds } = require('../../../util/date')
const {
  getAggregationQuery,
  getTimeResourceFilter,
  BinsAllocationMethod,
  postAggregateResults
} = require('../aggregation')

const topicQueries = decypher('./queries/topic.cyp')

const idsProducer = 'WITH null AS ids'

const equalBucketAggregationBucketProducer = maxBucketSize => `
WITH 
  collect(res) AS items
WITH
  items,
  floor(size(items) / ${maxBucketSize}) AS step
WITH
  items,
  toInteger(head([a in [step,1] where a > 0])) as step
UNWIND range(0, size(items), step) AS i
WITH
  items[i..i+step] AS bucket,
  i AS aggregationKey
WITH
  bucket,
  aggregationKey,
  [i in bucket where i.topic_modelling__scores is not null | i.topic_modelling__scores] AS aggregatable
`

const monthAggregationBucketProducer = `
WITH
  res.start_month AS aggregationKey,
  collect(res) AS bucket
WITH
  aggregationKey,
  bucket,
  [i in bucket where i.topic_modelling__scores is not null | i.topic_modelling__scores] AS aggregatable
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

/**
 * @typedef {(items: number[]) => number} RowAggregator
 * @typedef {(items: number[][]) => number[][]} Normaliser
 */

// const identityValueExtractor = data => data.map(d => d.value)
/** @type {Normaliser} */
const normalisingValueExtractor = items => {
  const globalMax = max(items.map(item => max(item)))
  return items.map(item => item.map(i => i / globalMax))
}


/**
 * @typedef {object} AggregatorAndNormaliser
 * @property {RowAggregator} rowAggregator
 * @property {Normaliser} normaliser
 */

/**
 * @type {{[key: string]: AggregatorAndNormaliser}}
 */
const AggregationMethods = {
  max: {
    rowAggregator: max,
    normaliser: normalisingValueExtractor // identityValueExtractor
  },
  mean: {
    rowAggregator: mean,
    normaliser: normalisingValueExtractor
  },
  sum: {
    rowAggregator: sum,
    normaliser: data => data.map(d => {
      const m = max(d)
      return d.map(i => i / m)
    })
  },
  // This method is actually the same as normalised mean
  weightedSum: {
    rowAggregator: sum,
    normaliser: normalisingValueExtractor
  }
}

async function getConfiguration() {
  return {
    type: 'bubble',
    label: 'Topic modelling scores',
    aspect: 'topicModellingScores',
    units: 2
  }
}

async function getFilters() {
  return [
    {
      type: 'selection',
      label: 'Topic modelling aggregation',
      key: 'aggregationMethod',
      values: ['mean', 'max'],
      showHelpTooltip: true
    }
  ]
}

function parseDataParameters(parameters = {}) {
  const {
    bins, from, to, aggregationMethod, method
  } = parameters
  return {
    fromTime: isString(from) ? toUnixSeconds(from) : undefined,
    toTime: isString(to) ? toUnixSeconds(to, true) : undefined,
    bins: isString(bins) ? parseInt(bins, 10) : undefined,
    aggregationMethod,
    method
  }
}

/**
 * @param {string} method
 * @param {number} bins
 * @param {number} fromTime unix time
 * @param {number} toTime unix time
 * @return {Promise<import('../aggregation').AggregationItem[]>}
 */
async function getTopicModellingScores(method, bins, fromTime, toTime) {
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

async function getTopicLabels(set) {
  const labelsAndIndices = await executeQuery(topicQueries.get_labels_and_indices_for_set, { set })
  return sortBy(labelsAndIndices, i => parseInt(i.index, 10)).map(i => i.label)
}

/**
 * @param {RowAggregator} rowAggregator
 * @param {number} maxTopicsCount
 * @return {(items: number[][]) => number[]}
 */
const getAggregator = (rowAggregator, maxTopicsCount) => {
  const zeros = range(0, maxTopicsCount).map(() => 0)
  return topicScoresList => {
    const items = topicScoresList.length === 0 ? [zeros] : topicScoresList
    const x = range(0, maxTopicsCount)
      .map(i => rowAggregator(items.map(scores => get(scores, i, 0))))
    return x
  }
}

async function getData(parameters = {}) {
  const {
    bins, fromTime, toTime,
    aggregationMethod = 'mean', // 'max',
    set = 'default',
    method
  } = parseDataParameters(parameters)

  const [
    resultItems,
    labels
  ] = await Promise.all([
    getTopicModellingScores(method, bins, fromTime, toTime),
    getTopicLabels(set)
  ])

  const { rowAggregator, normaliser } = AggregationMethods[aggregationMethod]
  assert(rowAggregator !== undefined, `Unknown aggregation method: ${aggregationMethod}`)

  const maxTopicsCount = max(resultItems
    .map(({ aggregatable }) => max(aggregatable.map(i => i.length))))
  const aggregator = getAggregator(rowAggregator, maxTopicsCount)

  /** @type {number[][]} */
  const preNormalisedData = resultItems.map(({ aggregatable }) => aggregator(aggregatable))
  const meta = resultItems.map(i => omit(i, ['aggregationKey', 'aggregatable']))

  const data = normaliser(preNormalisedData)

  return {
    data,
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
