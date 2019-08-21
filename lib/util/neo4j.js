const { isPlainObject } = require('lodash')
const neo4j = require('neo4j-driver').default

const settings = require('../../settings')
const { agentBrown: prepareQuery } = require('../../parser')

const MutationQueryRegex = /[\s\n]set[\s\n]/i

const driver = neo4j.driver(
  settings.neo4j.host.uri,
  neo4j.auth.basic(settings.neo4j.host.user, settings.neo4j.host.pass),
  {
    maxConnectionLifetime: 1 * 60 * 60 * 1000, // 1 hour
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 2 * 60 * 1000, // 120 seconds
    maxTransactionRetryTime: 30 * 1000, // 30 sec
    disableLosslessIntegers: true
  }
)

function amendResult(o) {
  if (!isPlainObject(o)) return o
  return Object.keys(o).reduce((acc, k) => {
    const v = o[k]
    if (v instanceof neo4j.types.Node || v instanceof neo4j.types.Relationship) {
      acc[k] = v.properties
    } else if (isPlainObject(o)) {
      acc[k] = amendResult(v)
    } else {
      acc[k] = v
    }
    return acc
  }, {})
}

async function executeQuery(query, parameters) {
  const session = driver.session()
  const fn = tx => tx.run(query, parameters)
    .then(({ records }) => records.map(rec => {
      if (rec.keys.length === 1) {
        return rec.get(rec.keys[0])
      }
      return rec.toObject()
    }).map(amendResult))

  const transaction = query.match(MutationQueryRegex)
    ? session.writeTransaction(fn)
    : session.readTransaction(fn)

  return transaction
    .then(r => {
      session.close()
      return r
    })
}

module.exports = {
  executeQuery,
  prepareQuery
}
