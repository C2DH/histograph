const { executeQuery } = require('../../util/neo4j')
const { fromNeo4jResource } = require('../../converters/db')

/**
 * We use a simple way of calculating recommended resources:
 *  - find all resources that have at least one common entity with the original resource
 *  - sort them by total number of common entities (more common entities - more recommended)
 *  - those resources that have equal number of common entities are additionally
 *    sorted by distance in time (the closer they are in time - the more recommended they are)
 */
const RecommendedResourcesQueryHead = /* cypher */ `
  MATCH (original_resource:resource {uuid: $uuid})<-[:appears_in]-(e:entity)-[:appears_in]->(related_resource:resource)
  WITH size(collect(e)) AS common_entities_size,
      related_resource,
      abs(related_resource.start_time - original_resource.start_time) as time_distance
  WHERE common_entities_size > 0
`

const Query = {
  RecommendedResources: filters => /* cypher */ `
    ${RecommendedResourcesQueryHead}
    ${filters.from ? ' AND related_resource.start_date >= $from ' : ''}
    ${filters.to ? ' AND related_resource.start_date <= $to ' : ''}
    RETURN related_resource
    ORDER BY common_entities_size DESC, time_distance ASC
    SKIP $offset
    LIMIT $limit
  `,
  RecommendedResourcesCount: filters => /* cypher */ `
    ${RecommendedResourcesQueryHead}
    ${filters.from ? ' AND related_resource.start_date >= $from ' : ''}
    ${filters.to ? ' AND related_resource.start_date <= $to ' : ''}
    RETURN count(related_resource) as total
  `
}

async function findRecommendedResourcesFor(
  _,
  {
    uuid,
    filters = {},
    page: { limit = 50, offset = 0 } = {}
  } = {}
) {
  const params = Object.assign({
    from: null,
    to: null
  }, filters, {
    uuid,
    limit,
    offset
  })
  const queries = [
    Query.RecommendedResources(params),
    Query.RecommendedResourcesCount(params)
  ]
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
