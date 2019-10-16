const {
  isPlainObject,
  isArray,
  fill,
  noop
} = require('lodash')
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
  // eslint-disable-next-line no-use-before-define
  if (!isPlainObject(o)) return amendValue(o)
  return Object.keys(o).reduce((acc, k) => {
    const v = o[k]
    // eslint-disable-next-line no-use-before-define
    acc[k] = amendValue(v)
    return acc
  }, {})
}

const amendValue = v => {
  if (v instanceof neo4j.types.Node || v instanceof neo4j.types.Relationship) {
    return amendResult(v.properties)
  }
  if (neo4j.isInt(v)) {
    return v.toNumber()
  }
  if (isPlainObject(v)) {
    return amendResult(v)
  }
  if (isArray(v)) {
    return v.map(amendResult)
  }
  if (neo4j.isDateTime(v)) {
    return v.toString()
  }
  return v
}

/**
 * Execute a list of `[query, parameters]` pairs in a single transaction.
 * @param {array} queryAndParametersList a list of tuples: `query` and `parameters`.
 * @param {boolean} isRead - is transaction a READ transaction (default READ)
 * @return {array} an array of arrays of results
 */
async function executeQueriesWithTransactionAndSubscribe(queryAndParametersList, isRead = true) {
  return new Promise((resolve, reject) => {
    const session = driver.session({
      defaultAccessMode: isRead ? neo4j.session.READ : neo4j.session.WRITE
    })

    const resultItems = fill(Array(queryAndParametersList.length), [])

    const tx = session.beginTransaction()

    queryAndParametersList.forEach(([query, parameters], idx) => {
      const collector = resultItems[idx]
      tx.run(query, parameters).subscribe({
        onNext: record => {
          const item = record.keys.length === 1
            ? record.get(record.keys[0])
            : record.toObject()
          collector.push(amendResult({ item }).item)
        },
        // onCompleted: () => {},
        onError: e => reject(e)
      })
    })

    tx.commit().subscribe({
      onCompleted: () => {
        resolve(resultItems)
        session.close()
      },
      onError: e => reject(e)
    })
  })
}

async function _executeInTransaction(query, parameters, tx) {
  return new Promise((resolve, reject) => {
    const results = []
    tx.run(query, parameters).subscribe({
      onNext: record => {
        const item = record.keys.length === 1
          ? record.get(record.keys[0])
          : record.toObject()
        results.push(amendResult({ item }).item)
      },
      onCompleted: () => resolve(results),
      onError: e => reject(e)
    })
  })
}

async function withTransaction(blockFn = noop, isRead = true) {
  const session = driver.session()
  const fn = isRead ? 'readTransaction' : 'writeTransaction'

  return session[fn](async tx => {
    const exec = (query, parameters) => _executeInTransaction(query, parameters, tx)
    return blockFn(exec)
  })
}

// eslint-disable-next-line no-unused-vars
async function executeQuery(query, parameters) {
  return new Promise((resolve, reject) => {
    const isRead = !query.match(MutationQueryRegex)
    const session = driver.session({
      defaultAccessMode: isRead ? neo4j.session.READ : neo4j.session.WRITE
    })

    const items = []
    session.run(query, parameters).subscribe({
      onNext: record => {
        const item = record.keys.length === 1
          ? record.get(record.keys[0])
          : record.toObject()
        items.push(amendResult({ item }).item)
      },
      onCompleted: () => {
        resolve(items)
        session.close()
      },
      onError: e => reject(e)
    })
  })
}

module.exports = {
  executeQuery,
  executeQueriesWithTransaction: executeQueriesWithTransactionAndSubscribe,
  withTransaction,
  prepareQuery
}
