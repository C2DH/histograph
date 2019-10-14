const { flatten } = require('lodash')
const { executeQuery } = require('../../util/neo4j')
const { contextYamlToContexts } = require('../../converters/migration')

// eslint-disable-next-line no-console
const log = (...args) => console.log(...args)

const getResourceWithNoContextQuery = languageCode => `
MATCH (r:resource)-[:describes]-(v:version {language: "${languageCode}"})
RETURN {
  resourceUuid: r.uuid,
  contextYaml: v.yaml    
} as result
SKIP {skip}
LIMIT {limit}
`

const getUpdateQuery = languageCode => `
UNWIND {items} as item
MATCH (r:resource {uuid: item.resourceUuid})-[a:appears_in]-(e:entity {uuid: item.entityUuid})
SET a.context__${languageCode} = item.context
RETURN id(a) as id
`

/**
 * Returns a list of objects:
 * { resourceUuid, contextYaml }
 */
async function getBatchOfResourcesWithNoContexts(languageCode, batchSize, skipSize) {
  const query = getResourceWithNoContextQuery(languageCode)
  return executeQuery(query, { limit: batchSize, skip: skipSize })
}

async function performUpdate(languageCode, contexts) {
  const query = getUpdateQuery(languageCode)
  // log(`${query} \n ${JSON.stringify({ items: contexts })}`)
  return executeQuery(query, { items: contexts })
}

function prepareUpdateContext(resourceUuid, contextYaml) {
  const contexts = contextYamlToContexts(contextYaml)
  return contexts.map(([entityUuid, context]) => ({
    resourceUuid,
    entityUuid,
    context: flatten(context)
  }))
}

async function main(languageCode = 'en', batchSize = 100) {
  let resources = []
  let resourcesCounter = 0
  let updatesCounter = 0
  do {
    // eslint-disable-next-line no-await-in-loop
    resources = await getBatchOfResourcesWithNoContexts(languageCode, batchSize, resourcesCounter)
    const updateContexts = flatten(resources
      .map(({ resourceUuid, contextYaml }) => prepareUpdateContext(resourceUuid, contextYaml)))

    // eslint-disable-next-line no-await-in-loop
    const updatedIds = await performUpdate(languageCode, updateContexts)
    resourcesCounter += batchSize
    updatesCounter += updatedIds.length
    log(`Done ${resourcesCounter} resource / entity pairs and performed ${updatesCounter} updates`)
  } while (resources.length > 0)
}

if (require.main === module) {
  main()
    .then(() => {
      log('Done')
      process.exit(0)
    })
    .catch(e => {
      log(`Error occurred: ${e.stack}`)
      process.exit(1)
    })
}
