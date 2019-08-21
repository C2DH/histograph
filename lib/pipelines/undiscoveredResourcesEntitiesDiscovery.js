const decypher = require('decypher')
const { assignIn, cloneDeep } = require('lodash')

const { getLogger } = require('../util/log')
const { execute: executeResourceEntitiesDiscovery } = require('./resourceEntitiesDiscovery')
const { executeQuery } = require('../util/neo4j')

const log = getLogger()

const resourceQueries = decypher(`${__dirname}/../../queries/resource.cyp`)

async function execute(options = {}) {
  const uuids = await executeQuery(resourceQueries.get_uuids_of_not_discovered_resources, {})

  log.info(`${uuids.length} undiscovered resources found`)

  let counter = 0
  // eslint-disable-next-line no-restricted-syntax
  for (const resourceUuid of uuids) {
    const opts = assignIn(cloneDeep(options), { resourceUuid })
    try {
      log.info(`Processing resource ${counter + 1} out of ${uuids.length}`)
      // eslint-disable-next-line no-await-in-loop
      const result = await executeResourceEntitiesDiscovery(opts)
      log.info(result)
    } catch (e) {
      log.error(`An error occurred while discovering resource "${resourceUuid}":`, e.stack)
    }
    counter += 1
  }

  return `All ${uuids.length} resources have been discovered`
}

module.exports = { execute }
