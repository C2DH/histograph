const { get, negate, isNil } = require('lodash')
const { getLogger } = require('../../util/log')

const log = getLogger()
const settings = require('../../../settings')

const DefaultAvailableAspects = ['keywordPresenceFrequency']

async function getAvailableAspects() {
  const aspectIds = get(settings, 'bucketOfExplorables.availableAspects', [])
  const aspectConfigurations = await Promise.all(aspectIds.map(async id => {
    try {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const { getConfiguration } = require(`./aspects/${id}`)
      return getConfiguration()
    } catch (e) {
      log.error(`Could not get aspect "${id}": ${e.message}`)
      return undefined
    }
  }))

  const configurations = aspectConfigurations.filter(negate(isNil))

  return configurations.length > 0 ? configurations : DefaultAvailableAspects
}

async function getAspectFilters(aspectId) {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const { getFilters } = require(`./aspects/${aspectId}`)
  return getFilters()
}

async function getAspectData(aspectId, parameters) {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const { getData } = require(`./aspects/${aspectId}`)
  return getData(parameters)
}
module.exports = {
  getAspectFilters,
  getAspectData,
  getAvailableAspects
}
