const decypher = require('decypher')

const { executeQuery } = require('../util/neo4j')
const { getLogger } = require('../util/log')
const { execute: executeExpandEntity } = require('./expandEntity')

const log = getLogger()

const entityQueries = decypher(`${__dirname}/../../queries/entity.cyp`)

async function getEntityUuidsByEntityModel(model) {
  const result = await executeQuery(
    entityQueries.find_ids_by_entity_ned_model,
    { entity_ned_model: model }
  )
  return result
}

async function execute(options = {}) {
  const { entityModel } = options

  const uuids = await getEntityUuidsByEntityModel(entityModel)


  log.info(`${uuids.length} entities with model "${entityModel}" found`)

  let counter = 0
  // eslint-disable-next-line no-restricted-syntax
  for (const entityUuid of uuids) {
    try {
      log.info(`Processing entity ${counter + 1} out of ${uuids.length}`)
      // eslint-disable-next-line no-await-in-loop
      const result = await executeExpandEntity({ entityUuid })
      log.info(result)
    } catch (e) {
      log.error(`An error occurred while expanding entity "${entityUuid}":`, e.stack)
    }
    counter += 1
  }

  return `All ${uuids.length} entities have been expanded`
}

module.exports = { execute }
