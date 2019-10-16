const assert = require('assert')
const { get, uniqBy } = require('lodash')
const {
  getEntityAndResourceIdentifiers,
} = require('../store')
const { executeQuery } = require('../../../util/neo4j')
const {
  toNeo4jAppearance, fromNeo4jAppearance
} = require('../../../converters/db')
const { validated } = require('../../../util/json')

async function createMeta({
  entityUuid, resourceUuid, context
}) {
  const identifiers = await getEntityAndResourceIdentifiers(entityUuid, resourceUuid)
  assert.ok(identifiers !== undefined, `Could not find entity ${entityUuid} or resource ${resourceUuid}`)
  const {
    entityIdentifier,
    resourceIdentifier
  } = identifiers

  return {
    entity: entityIdentifier,
    resource: resourceIdentifier,
    context
  }
}

const QueryLinkEntityToResource = `
  OPTIONAL MATCH (e:entity { slug: {entitySlug} })
  OPTIONAL MATCH (r:resource { slug: {resourceSlug} })
  MERGE (e)-[a:appears_in]->(r)
  SET a += {appearance}
  RETURN {
    entityUuid: e.uuid,
    resourceUuid: r.uuid,
    appearanceId: id(a)
  }
`

const QueryGetExistingAppearance = `
  MATCH (e:entity { slug: {entitySlug} })-[a:appears_in]->(r:resource { slug: {resourceSlug} })
  RETURN a
`

function mergeContext(appearance, context = {}) {
  const oldContext = get(appearance, 'context', {})

  return Object.keys(context).reduce((newContext, languageCode) => {
    // eslint-disable-next-line no-param-reassign
    newContext[languageCode] = uniqBy(
      (oldContext[languageCode] || []).concat(context[languageCode]),
      JSON.stringify
    ).sort((a, b) => a[0] > b[0])
    return newContext
  }, oldContext)
}

async function linkEntity({ meta }) {
  const { entity: { slug: entitySlug }, resource: { slug: resourceSlug }, context } = meta
  const appearance = (await executeQuery(QueryGetExistingAppearance, { entitySlug, resourceSlug }))
    .map(fromNeo4jAppearance)[0]

  const newContext = mergeContext(appearance, context)
  const newAppearance = validated({
    ...appearance || {},
    context: newContext,
    languages: Object.keys(newContext)
  }, 'db/appears_in.json')

  const params = { entitySlug, resourceSlug, appearance: toNeo4jAppearance(newAppearance) }
  const {
    entityUuid, resourceUuid, appearanceId
  } = (await executeQuery(QueryLinkEntityToResource, params))[0]

  if (appearanceId === null) {
    return [
      `Entity (${entityUuid}) could not be linked to resource (${resourceUuid})`,
      false
    ]
  }
  if (entityUuid === null || resourceUuid === null) {
    return [
      `Either entity (${entityUuid}) or resource (${resourceUuid}) not found`,
      false
    ]
  }
  return [
    `Entity (${entityUuid}) is linked to resource (${resourceUuid})`,
    true
  ]
}

module.exports = {
  createMeta,
  performListeners: [
    linkEntity
  ]
}
