/**
 * Frequency of a keyword being mentioned in resources. If a keyword
 * is mentioned more than once in a resource it is counted as one mention
 * due to limitations of Neo4j DB.
 */
const {
  isString, sum, sortBy,
  max, flatten, isArray
} = require('lodash')
const decypher = require('decypher')
const { prepareQuery, executeQuery } = require('../../../util/neo4j')
const { toUnixSeconds } = require('../../../util/date')
const { aggregate } = require('../aggregation')

const resourceQueries = decypher('./queries/resource.cyp')

function parseDataParameters(parameters = {}) {
  const {
    bins, from, to, keyword
  } = parameters
  return {
    fromTime: isString(from) ? toUnixSeconds(from) : undefined,
    toTime: isString(to) ? toUnixSeconds(to) : undefined,
    bins: isString(bins) ? parseInt(bins, 10) : undefined,
    keyword
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
      type: 'value',
      label: 'Keyword',
      key: 'keyword',
    }
  ]
}

/**
 * @return a list of:
 * {
 *   uuid: "...",
 *   startDate: "xxx",
 *   mentions: 1 // 1 or 0
 * }
 */
async function getResources(fromTime, toTime, keyword) {
  const params = { start_time: fromTime, end_time: toTime, keyword }
  const query = prepareQuery(resourceQueries.find_keyword_frequency_aspect, params)
  return executeQuery(query, params)
}

async function getData(parameters = {}) {
  const {
    bins, fromTime, toTime, keyword
  } = parseDataParameters(parameters)

  // NOTE: we use a UNION query which apparently does not support sorting after union.
  const resources = sortBy(
    keyword ? await getResources(fromTime, toTime, keyword) : [],
    item => item.startDate
  )
  const aggregatedData = aggregate(resources, bins, item => item.mentions, sum)

  const data = aggregatedData.map(d => d.value)
  const meta = aggregatedData.map(({ itemsCount, firstItem, lastItem }) => ({
    totalResources: itemsCount,
    minStartDate: firstItem.startDate,
    maxStartDate: lastItem.startDate,
    firstResourceUuid: firstItem.uuid,
    lastResourceUuid: lastItem.uuid
  }))

  const maxMentionsCount = max(flatten(data))
  const denominator = maxMentionsCount === 0 ? 1 : maxMentionsCount

  const labels = keyword ? [keyword] : []

  return {
    data: data.map(item => {
      const v = isArray(item) ? item : [item]
      return v.map(i => [i / denominator, i])
    }),
    meta,
    labels
  }
}

module.exports = {
  getConfiguration,
  getFilters,
  getData
}