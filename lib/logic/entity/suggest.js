const { executeQuery } = require('../../util/neo4j')
const { fromNeo4jJson } = require('../../converters/db')

const QueryFindEntitiesByNamePattern = /* cypher */ `
CALL db.index.fulltext.queryNodes("name", $solrQuery)
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
SKIP $skip
LIMIT $limit
`

const QueryFindMentionedEntitiesByNamePattern = resourceWhereClause => /* cypher */ `
// 1. get entities matching full text query
CALL db.index.fulltext.queryNodes("name", $solrQuery)
YIELD node AS e
WHERE
  'entity' in labels(e)
// 2. filter by mentions in documents
MATCH (e)-[:appears_in]-(r:resource)
WHERE true
  ${resourceWhereClause}
WITH e, count(r) as mentions
ORDER BY mentions DESC
// 3. prepare items
WITH collect({
  entity: e,
  type: last(labels(e)),
  mentions: mentions
}) as items
// 4. get total count of mentioned entities and a subset
WITH size(items) as total, items[$limitFrom..$limitTo] as entities
RETURN {
  items: entities,
  total: total
}
`

const constraintsToResourceWhereClause = constraints => {
  const items = Object.keys(constraints).map(key => {
    if (['from', 'to'].includes(key)) {
      const op = key === 'from' ? '>=' : '<='
      return `r.start_date ${op} $${key}`
    }
    return undefined
  }).filter(item => item !== undefined)
  return items.map(item => `AND ${item}`).join('\n')
}

/**
 * Return entities subset and total entities matching solr query.
 * Returns both mentioned and not mentioned entities.
 * @param {string} solrQuery solr query
 * @param {object} skipAndLimit
 */
async function findEntitiesByNamePattern(solrQuery, { limit = 50, skip = 0 } = {}) {
  const params = {
    limit,
    skip,
    solrQuery
  }
  return (await executeQuery(QueryFindEntitiesByNamePattern, params))
    .map(({ entity, type, mentions }) => Object.assign(fromNeo4jJson(entity), { type, mentions }))
}

/**
 * Return subset of entities and total number of entities that:
 *  - match solr query
 *  - mentioned in at least one document
 *  - satisfy optional constraints (start date of the document is between `from` and `to`).
 * @param {string} solrQuery solr query
 * @param {object} constraints optional constraints of the documents mentioning entities
 * @param {object} skipAndLimit - skip and limit
 */
async function findMentionedEntitiesByNamePattern(
  solrQuery,
  constraints = {},
  { limit = 50, skip = 0 } = {}
) {
  const whereClause = constraintsToResourceWhereClause(constraints)
  const query = QueryFindMentionedEntitiesByNamePattern(whereClause)
  const params = Object.assign({
    limitFrom: skip,
    limitTo: limit + skip,
    solrQuery
  }, constraints)
  const result = (await executeQuery(query, params))[0]

  if (result === undefined) {
    return {
      items: [],
    }
  }
  return {
    info: { total: result.total },
    items: result.items.map(({ entity, type, mentions }) => ({
      type,
      mentions,
      entity: fromNeo4jJson(entity)
    }))
  }
}

module.exports = {
  findEntitiesByNamePattern,
  findMentionedEntitiesByNamePattern
}
