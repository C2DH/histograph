const assert = require('assert')
const { get, uniqBy } = require('lodash')
const decypher = require('decypher')

const {
  getEntityAndResourceIdentifiers,
} = require('../store')
const { translateContextWithLocation } = require('../util')
const { executeQuery } = require('../../../util/neo4j')
const {
  toNeo4jAppearance, fromNeo4jAppearance,
  fromNeo4jResource
} = require('../../../converters/db')
const { validated } = require('../../../util/json')

const resourceQueries = decypher(`${__dirname}/../../../../queries/resource.cyp`)

/**
 * Create metadata for link entity action
 * @param {string} entityUuid id of the entity to link
 * @param {string} resourceUuid resource to link to
 * @param {object} context optional location of the entity in
 *                         text (same format as `context` in `appears_in`)
 * @param {string} contextLocation optional tag providing a hint how to treat context.
 *                                 If it is not provided, the usual title, caption, content
 *                                 concatenation rules are followed (see `context` in `appears_in`).
 *                                 If it is provided, then the hinted text field should be used.
 *
 */
async function createMeta({
  entityUuid, resourceUuid, context, contextLocation
}) {
  const identifiers = await getEntityAndResourceIdentifiers(entityUuid, resourceUuid)
  assert.ok(identifiers !== undefined, `Could not find entity ${entityUuid} or resource ${resourceUuid}`)

  let updatedContext = context

  if (contextLocation !== undefined) {
    const resources = await executeQuery(
      resourceQueries.get_resource_by_uuid,
      { uuid: resourceUuid }
    )
    const resource = resources.map(fromNeo4jResource)[0]
    assert.ok(resource !== undefined)
    updatedContext = translateContextWithLocation(context, contextLocation, resource)
  }

  const {
    entityIdentifier,
    resourceIdentifier
  } = identifiers

  return {
    entity: entityIdentifier,
    resource: resourceIdentifier,
    context: updatedContext
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
