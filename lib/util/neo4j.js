const { isPlainObject, isArray } = require('lodash')
const neo4j = require('neo4j-driver')

const settings = require('../../settings')
const { agentBrown: prepareQuery } = require('../../parser')

const MutationQueryRegex = /[\s\n]set[\s\n]/i

const driver = neo4j.driver(
  settings.neo4j.host.uri,
  neo4j.auth.basic(settings.neo4j.host.user, settings.neo4j.host.pass),
  {
    // maxConnectionLifetime: 1 * 60 * 60 * 1000, // 1 hour
    // maxConnectionPoolSize: 30,
    // connectionAcquisitionTimeout: 2 * 60 * 1000, // 120 seconds
    // maxTransactionRetryTime: 30 * 1000, // 30 sec
    // disableLosslessIntegers: true,
    // encrypted: false,
    // trust: 'TRUST_ALL_CERTIFICATES'
  }
)

function amendResult(o) {
  if (!isPlainObject(o)) return o
  return Object.keys(o).reduce((acc, k) => {
    const v = o[k]
    if (v instanceof neo4j.types.Node || v instanceof neo4j.types.Relationship) {
      acc[k] = amendResult(v.properties)
    } else if (isPlainObject(v)) {
      acc[k] = amendResult(v)
    } else if (isArray(v)) {
      acc[k] = v.map(amendResult)
    } else if (neo4j.isInt(v)) {
      acc[k] = v.toNumber()
    } else {
      acc[k] = v
    }
    return acc
  }, {})
}

async function executeQueryWithTransaction(query, parameters) {
  const session = driver.session()
  const isWrite = query.match(MutationQueryRegex)

  const fn = tx => tx.run(query, parameters)
    .then(({ records }) => records.map(rec => {
      if (rec.keys.length === 1) {
        return rec.get(rec.keys[0])
      }
      return rec.toObject()
    }).map(x => amendResult({ x }).x))

  const transaction = isWrite
    ? session.writeTransaction(fn)
    : session.readTransaction(fn)

  return transaction
    .then(r => {
      setTimeout(() => session.close(), 0)
      return r
    })
    .catch(e => {
      setTimeout(() => session.close(), 0)
      throw e
    })
}

// eslint-disable-next-line no-unused-vars
async function executeQuery(query, parameters) {
  const session = driver.session()

  return session.run(query, parameters)
    .then(({ records }) => records.map(rec => {
      if (rec.keys.length === 1) {
        return rec.get(rec.keys[0])
      }
      return rec.toObject()
    }).map(x => amendResult({ x }).x))
    .then(r => {
      setTimeout(() => session.close(), 0)
      return r
    })
    .catch(e => {
      setTimeout(() => session.close(), 0)
      throw e
    })
}

module.exports = {
  executeQuery: executeQueryWithTransaction,
  executeQueryWithTransaction,
  prepareQuery
}
