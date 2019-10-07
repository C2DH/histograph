const assert = require('assert')
const decypher = require('decypher')
const {
  isString, max, fill,
  isNil, mean, sortBy,
  range, sum
} = require('lodash')
const { prepareQuery, executeQuery } = require('../../../util/neo4j')
const { toUnixSeconds } = require('../../../util/date')
const { aggregate } = require('../aggregation')

const resourceQueries = decypher('./queries/resource.cyp')
const topicQueries = decypher('./queries/topic.cyp')

// const identityValueExtractor = data => data.map(d => d.value)
const normalisingValueExtractor = data => {
  const globalMax = max(data.map(d => max(d.value)))
  return data.map(d => d.value.map(i => i / globalMax))
}

const AggregationMethods = {
  max: {
    aggregator: max,
    valueExtractor: normalisingValueExtractor // identityValueExtractor
  },
  mean: {
    aggregator: mean,
    valueExtractor: normalisingValueExtractor
  },
  sum: {
    aggregator: sum,
    valueExtractor: data => data.map(d => {
      const m = max(d.value)
      return d.value.map(i => i / m)
    })
  },
  // This method is actually the same as normalised mean
  weightedSum: {
    aggregator: sum,
    valueExtractor: normalisingValueExtractor
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
    bins, from, to, aggregationMethod
  } = parameters
  return {
    fromTime: isString(from) ? toUnixSeconds(from) : undefined,
    toTime: isString(to) ? toUnixSeconds(to, true) : undefined,
    bins: isString(bins) ? parseInt(bins, 10) : undefined,
    aggregationMethod
  }
}

/**
 * @param {number} fromTime unix time
 * @param {number} toTime unix time
 * @return a list of:
 * {
 *  uuid, scores, startDate, endDate
 * }
 */
async function getTopicModellingScores(fromTime, toTime) {
  const params = { start_time: fromTime, end_time: toTime }
  const query = prepareQuery(resourceQueries.find_topic_modelling_scores, params)
  return executeQuery(query, params)
}

async function getTopicLabels(set) {
  const labelsAndIndices = await executeQuery(topicQueries.get_labels_and_indices_for_set, { set })
  return sortBy(labelsAndIndices, i => parseInt(i.index, 10)).map(i => i.label)
}

function fillEmptyScoresDataWithZeros(scores) {
  const maxLength = max(scores.map(i => (isNil(i) ? 0 : i.length)))
  const zeros = fill(Array(maxLength), 0)
  return scores.map(i => {
    if (isNil(i) || i.length === 0) return zeros
    return i
  })
}

async function getData(parameters = {}) {
  const {
    bins, fromTime, toTime,
    aggregationMethod = 'mean', // 'max',
    set = 'default'
  } = parseDataParameters(parameters)

  const [
    scoresData,
    labels
  ] = await Promise.all([
    getTopicModellingScores(fromTime, toTime),
    getTopicLabels(set)
  ])

  const { aggregator, valueExtractor } = AggregationMethods[aggregationMethod]
  assert(aggregator !== undefined, `Unknown aggregation method: ${aggregationMethod}`)

  const topicsCount = max(scoresData.map(i => (i.scores ? i.scores.length : 0)))
  const emptyScores = range(0, topicsCount).map(() => 0)
  const getScores = item => (item.scores ? item.scores : emptyScores)

  const aggregatedData = aggregate(scoresData, bins, getScores, aggregator)

  const data = valueExtractor(aggregatedData)

  const meta = aggregatedData.map(({ itemsCount, firstItem, lastItem }) => ({
    totalResources: itemsCount,
    minStartDate: firstItem.startDate,
    maxStartDate: lastItem.startDate,
    minEndDate: firstItem.endDate,
    maxEndDate: lastItem.endDate,
    firstResourceUuid: firstItem.uuid,
    lastResourceUuid: lastItem.uuid
  }))

  return {
    data: fillEmptyScoresDataWithZeros(data),
    meta,
    labels
  }
}

module.exports = {
  getConfiguration,
  getFilters,
  getData
}
