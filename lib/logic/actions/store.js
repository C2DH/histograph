const { executeQuery } = require('../../util/neo4j')
const { toNeo4jJson, fromNeo4jJson } = require('../../converters/db')

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
    slug: r.slug,
    name: r.name,
    type: last(labels(e))
  },
  resourceIdentifier: {
    slug: r.slug,
    name: r.name
  }
}
`

async function savePendingAction(action) {
  const params = {
    action: toNeo4jJson(action)
  }
  const results = await executeQuery(QuerySavePendingAction, params)
  return fromNeo4jJson(results[0])
}

async function setPendingActionPerformed(uuid) {
  return executeQuery(QueryMakeActionPerformed, { uuid })
}

async function addVoteFor(uuid, username) {
  return executeQuery(QueryAddVoteFor, { uuid, username })
}

async function addVoteAgainst(uuid, username) {
  return executeQuery(QueryAddVoteAgainst, { uuid, username })
}

async function getLinkedEntityAndResourceIdentifiers(entityUuid, resourceUuid) {
  return (await executeQuery(QueryGetLinkedEntityAndResourceIdentifier,
    { entityUuid, resourceUuid }))[0]
}

module.exports = {
  savePendingAction,
  setPendingActionPerformed,
  addVoteFor,
  addVoteAgainst,
  getLinkedEntityAndResourceIdentifiers,
}
