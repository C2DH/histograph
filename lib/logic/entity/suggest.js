const { executeQuery } = require('../../util/neo4j')
const { fromNeo4jJson } = require('../../converters/db')

const QueryFindEntitiesByNamePattern = `
CALL db.index.fulltext.queryNodes("name", {solrQuery})
YIELD node AS e
WHERE head(labels(e)) = 'entity'
RETURN {
  entity: e,
  type: last(labels(e))
}
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
    .map(({ entity, type }) => Object.assign(fromNeo4jJson(entity), { type }))
}

module.exports = {
  findEntitiesByNamePattern
}
