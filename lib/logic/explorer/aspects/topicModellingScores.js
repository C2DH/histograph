const assert = require('assert')
const decypher = require('decypher')
const {
  isString, max, fill,
  isNil, mean, sortBy
} = require('lodash')
const { prepareQuery, executeQuery } = require('../../../util/neo4j')
const { toUnixSeconds } = require('../../../util/date')
const { aggregate } = require('../aggregation')

const resourceQueries = decypher('./queries/resource.cyp')
const topicQueries = decypher('./queries/topic.cyp')

const AggregationMethods = {
  max, mean
}

async function getConfiguration() {
  return {
    type: 'bubble',
    label: 'Topic modelling scores',
    aspect: 'topicModellingScores'
  }
}

async function getFilters() {
  return []
}

function parseDataParameters(parameters = {}) {
  const { bins, from, to } = parameters
  return {
    fromTime: isString(from) ? toUnixSeconds(from) : undefined,
    toTime: isString(to) ? toUnixSeconds(to) : undefined,
    bins: isString(bins) ? parseInt(bins, 10) : undefined
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
    aggregationMethod = 'max',
    set = 'default'
  } = parseDataParameters(parameters)

  const [
    scoresData,
    labels
  ] = await Promise.all([
    getTopicModellingScores(fromTime, toTime),
    getTopicLabels(set)
  ])

  const aggregationFn = AggregationMethods[aggregationMethod]
  assert(aggregationFn !== undefined, `Unknown aggregation method: ${aggregationMethod}`)

  const aggregatedData = aggregate(scoresData, bins, item => item.scores, aggregationFn)

  const data = aggregatedData.map(d => d.value)
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
