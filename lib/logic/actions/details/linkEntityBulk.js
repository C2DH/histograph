const assert = require('assert')
const { isEmpty } = require('lodash')
const {
  getEntityIdentifier,
} = require('../store')
const { executeQuery } = require('../../../util/neo4j')

/**
 * Create metadata for bulk link entity action
 * @param {string} entityUuid id of the entity to link
 * @param {string} keyphrase an exact word or phrase to look for in
 *                           resources content. Resources that contain it
 *                           will be tagged with specified entity
 * @param {string} languageCode use the full text search index for this language.
 */
async function createMeta({
  entityUuid, keyphrase, languageCode
}) {
  const entityIdentifier = getEntityIdentifier(entityUuid)
  assert.ok(entityIdentifier !== undefined, `Could not find entity ${entityUuid}`)
  assert.ok(!isEmpty(keyphrase), `Keyphrase should not be empty: ${keyphrase}`)
  assert.ok(!isEmpty(languageCode), `Language code is required: ${languageCode}`)

  return {
    entity: entityIdentifier,
    keyphrase,
    languageCode
  }
}

const QueryBulkMergeEntity = `
  CALL db.index.fulltext.queryNodes({indexName}, {query})
  YIELD node AS r
  WHERE 'resource' in labels(r)
  MATCH (e:entity { slug: {entitySlug} })
  MERGE (e)-[a:appears_in]->(r)
  ON CREATE SET a += {}
  RETURN count(r) AS totalResources, e.uuid AS entityUuid
`

const getIndexName = languageCode => `text_${languageCode}`

async function linkEntity({ meta }) {
  const { entity: { slug: entitySlug }, keyphrase, languageCode } = meta
  const params = {
    indexName: getIndexName(languageCode),
    query: `"${keyphrase}"`,
    entitySlug
  }

  const results = await executeQuery(QueryBulkMergeEntity, params)
  if (results.length !== 1) {
    return [
      `No such entity found: ${entitySlug}`,
      false
    ]
  }

  const {
    totalResources,
    entityUuid
  } = results[0]

  return [
    `Entity ${entityUuid} is linked to ${totalResources} resources`,
    true
  ]
}

module.exports = {
  createMeta,
  performListeners: [
    linkEntity
  ]
}