const { get } = require('lodash')

const settings = require('../../../settings')

async function getExplorerConfiguration() {
  const ids = get(settings, 'explorer.defaultElements', [])
  const items = await Promise.all(ids.map(async id => {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const { getConfiguration } = require(`./aspects/${id}`)
    const configuration = await getConfiguration()
    return [id, configuration]
  }))

  return items.reduce((acc, [id, configuration]) => {
    acc[id] = configuration
    return acc
  }, {})
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
  getExplorerConfiguration,
  getAspectFilters,
  getAspectData
}
