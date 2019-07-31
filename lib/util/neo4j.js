const { concat } = require('lodash')
const { promisify } = require('util')
const seraph = require('seraph')
const { slice } = require('lodash')

const settings = require('../../settings')
const { agentBrown: prepareQuery } = require('../../parser')

const neo4jClient = seraph(settings.neo4j.host)

function createNeo4jQueryMethod() {
  return promisify((...args) => {
    const [query, params] = args
    const preparedQuery = prepareQuery(query, params)
    const updatedArgs = [preparedQuery, params].concat(slice(args, 2))
    return neo4jClient.query(...updatedArgs)
  })
}

async function executeQuery(query, ...args) {
  return new Promise((resolve, reject) => {
    const queryArgs = concat(args, [
      (e, result) => {
        if (e) return reject(e)
        return resolve(result)
      }
    ])
    neo4jClient.query(query, ...queryArgs)
  })
}

module.exports = {
  getQueryMethod: createNeo4jQueryMethod,
  executeQuery
}
