const { assignIn } = require('lodash')
const decypher = require('decypher')
const { executeQuery } = require('../../util/neo4j')
const { fromNeo4jAppearance, fromNeo4jResource, fromNeo4jJson } = require('../../converters/db')

const ResourceQueries = decypher('./queries/resource.cyp')

async function getFullResourceWithDetails(id, username) {
  const results = await executeQuery(ResourceQueries.get_resource_with_details, { id, username })
  const result = results[0]
  if (!result) return undefined
  return assignIn({}, result, {
    entities_and_appearances: result.entities_and_appearances
      .map(({ entity, appearance, type }) => ({
        type,
        entity: fromNeo4jJson(entity),
        appearance: fromNeo4jAppearance(appearance)
      })),
    resource: fromNeo4jResource(result.resource)
  })
}


module.exports = {
  getFullResourceWithDetails
}
