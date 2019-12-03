const { executeQuery } = require('../../util/neo4j')
const { fromNeo4jJson } = require('../../converters/db')

const QueryFindEntitiesByNamePattern = `
CALL db.index.fulltext.queryNodes("name", {solrQuery})
YIELD node AS e
OPTIONAL MATCH (e)-[:appears_in]-(r:resource)
WHERE 'entity' in labels(e)
WITH e, count(r) as mentions
RETURN {
  entity: e,
  type: last(labels(e)),
  mentions: mentions
}
ORDER BY mentions DESC
SKIP {skip}
LIMIT {limit}
`

async function findEntitiesByNamePattern(solrQuery, { limit = 50, skip = 0 } = {}) {
  const params = {
    limit,
    skip,
    solrQuery
  }
  return (await executeQuery(QueryFindEntitiesByNamePattern, params))
    .map(({ entity, type, mentions }) => Object.assign(fromNeo4jJson(entity), { type, mentions }))
}

module.exports = {
  findEntitiesByNamePattern
}
