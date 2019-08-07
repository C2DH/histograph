const {
  isString, sum, includes,
  max, flatten, isArray
} = require('lodash')
const decypher = require('decypher')
const { prepareQuery, executeQuery } = require('../../../util/neo4j')
const { toUnixSeconds } = require('../../../util/date')
const { aggregate } = require('../aggregation')

const entityQueries = decypher('./queries/entity.cyp')
const resourceQueries = decypher('./queries/resource.cyp')

function parseDataParameters(parameters = {}) {
  const {
    bins, from, to, excludingNationalities
  } = parameters
  return {
    fromTime: isString(from) ? toUnixSeconds(from) : undefined,
    toTime: isString(to) ? toUnixSeconds(to) : undefined,
    bins: isString(bins) ? parseInt(bins, 10) : undefined,
    excludingNationalities: excludingNationalities || []
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
  const values = (await executeQuery(query)).map(e => e.value)
  return [
    {
      type: 'multi-selection',
      label: 'Excluding nationals of',
      key: 'excludingNationalities',
      values
    }
  ]
}

/**
 * @return a list of:
 * {
 *   uuid: "...",
 *   startDate: "xxx",
 *   nationalities: [...]
 * }
 */
async function getResources(fromTime, toTime) {
  const params = { start_time: fromTime, end_time: toTime }
  const query = prepareQuery(resourceQueries.find_with_nationality_aspect, params)
  return executeQuery(query, params)
}

async function getData(parameters = {}) {
  const {
    bins, fromTime, toTime,
    excludingNationalities = []
  } = parseDataParameters(parameters)

  const getValueFromItemFn = item => {
    if (excludingNationalities.length > 0) {
      const totalNationalities = item.nationalities.length
      const filteredNationalities = item.nationalities
        .filter(n => !includes(excludingNationalities, n)).length
      return [filteredNationalities, totalNationalities]
    }
    return item.nationalities.length
  }

  const resources = await getResources(fromTime, toTime)
  const aggregatedData = aggregate(resources, bins, getValueFromItemFn, sum)

  const data = aggregatedData.map(d => d.value)
  const meta = aggregatedData.map(({ itemsCount, firstItem, lastItem }) => ({
    totalResources: itemsCount,
    minStartDate: firstItem.startDate,
    maxStartDate: lastItem.startDate,
    firstResourceUuid: firstItem.uuid,
    lastResourceUuid: lastItem.uuid
  }))

  const maxNationalitiesCount = max(flatten(data))
  const denominator = maxNationalitiesCount === 0 ? 1 : maxNationalitiesCount

  const labels = excludingNationalities.length > 0
    ? ['Filtered persons', 'All persons']
    : ['Persons']

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
