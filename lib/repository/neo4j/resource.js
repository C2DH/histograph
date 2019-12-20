const { executeQuery } = require('../../util/neo4j')
const { fromNeo4jResource } = require('../../converters/db')

const RecommendedResourcesQueryHead = /* cypher */ `
  MATCH (original_resource:resource {uuid: $uuid})<-[:appears_in]-(e:entity)-[:appears_in]->(related_resource:resource)
  WITH size(collect(e)) AS common_entities_size,
      related_resource,
      abs(related_resource.start_time - original_resource.start_time) as time_distance
  WHERE common_entities_size > 0
`

const Query = {
  RecommendedResources: /* cypher */ `
    ${RecommendedResourcesQueryHead}
    RETURN related_resource
    ORDER BY common_entities_size DESC, time_distance ASC
    SKIP $offset
    LIMIT $limit
  `,
  RecommendedResourcesCount: /* cypher */ `
    ${RecommendedResourcesQueryHead}
    RETURN count(related_resource) as total
  `
}

async function findRecommendedResourcesFor(
  _,
  {
    uuid,
    page: { limit = 50, offset = 0 } = {}
  } = {}
) {
  const queries = [
    Query.RecommendedResources,
    Query.RecommendedResourcesCount
  ]
  const params = {
    uuid,
    limit,
    offset
  }
  const [
    resources,
    [total]
  ] = await Promise.all(queries.map(async query => executeQuery(query, params)))
  return {
    resources: resources.map(fromNeo4jResource),
    info: {
      limit,
      offset,
      total
    }
  }
}

module.exports = {
  findRecommendedResourcesFor
}
