const { executeQuery } = require('../../util/neo4j')
const {
  toNeo4jChangeAction, fromNeo4jChangeAction
} = require('../../converters/db')

const QuerySavePendingAction = `
  CREATE (a:pending_change_action {action})
  SET a.createdAt = datetime()
  RETURN a
`

const QueryMakeActionPerformed = `
  MATCH (a:pending_change_action { uuid: {uuid} })
  REMOVE a:pending_change_action
  SET 
    a:change_action,
    a.performedAt = datetime()
  RETURN a
`

const QueryAddVoteFor = `
MATCH (a:pending_change_action { uuid: {uuid} })
WHERE 
  username NOT IN a.votedFor AND
  username NOT IN a.votedAgainst
SET 
  a.votedFor = a.votedFor + {username}
  a.totalVote = a.totalVote + 1
RETURN a
`

const QueryAddVoteAgainst = `
MATCH (a:pending_change_action { uuid: {uuid} })
WHERE 
  username NOT IN a.votedFor AND
  username NOT IN a.votedAgainst
SET 
  a.votedAgainst = a.votedAgainst + {username}
  a.totalVote = a.totalVote - 1
RETURN a
`

const QueryGetLinkedEntityAndResourceIdentifier = `
MATCH (e:entity { uuid: {entityUuid} })-[:appears_in]->(r:resource { uuid: {resourceUuid} })
RETURN {
  entityIdentifier: {
    slug: e.slug,
    name: e.name,
    type: last(labels(e))
  },
  resourceIdentifier: {
    slug: r.slug,
    name: r.name
  }
}
`

const QueryGetEntityAndResourceIdentifier = `
MATCH (e:entity { uuid: {entityUuid} })
MATCH (r:resource { uuid: {resourceUuid} })
RETURN {
  entityIdentifier: {
    slug: e.slug,
    name: e.name,
    type: last(labels(e))
  },
  resourceIdentifier: {
    slug: r.slug,
    name: r.name
  }
}
`

const QueryGetEntityIdentifier = type => `
  MATCH (e:entity:${type} { uuid: {entityUuid} })
  RETURN {
    slug: e.slug,
    name: e.name,
    type: last(labels(e))
  }
`

async function savePendingAction(action) {
  const params = {
    action: toNeo4jChangeAction(action)
  }
  const results = await executeQuery(QuerySavePendingAction, params)
  // console.log('ppp', results[0], results.map(fromNeo4jChangeAction)[0])
  return results.map(fromNeo4jChangeAction)[0]
}

async function setPendingActionPerformed(uuid) {
  return (await executeQuery(QueryMakeActionPerformed, { uuid })).map(fromNeo4jChangeAction)[0]
}

async function addVoteFor(uuid, username) {
  return (await executeQuery(QueryAddVoteFor, { uuid, username }))[0]
}

async function addVoteAgainst(uuid, username) {
  return (await executeQuery(QueryAddVoteAgainst, { uuid, username }))[0]
}

async function getLinkedEntityAndResourceIdentifiers(entityUuid, resourceUuid) {
  return (await executeQuery(QueryGetLinkedEntityAndResourceIdentifier,
    { entityUuid, resourceUuid }))[0]
}

async function getEntityAndResourceIdentifiers(entityUuid, resourceUuid) {
  return (await executeQuery(QueryGetEntityAndResourceIdentifier,
    { entityUuid, resourceUuid }))[0]
}

async function getEntityIdentifier(entityUuid, type) {
  return (await executeQuery(QueryGetEntityIdentifier(type),
    { entityUuid }))[0]
}

module.exports = {
  savePendingAction,
  setPendingActionPerformed,
  addVoteFor,
  addVoteAgainst,
  getLinkedEntityAndResourceIdentifiers,
  getEntityAndResourceIdentifiers,
  getEntityIdentifier
}
