/* eslint-env mocha */
const assert = require('assert')
const {
  getHeaders
} = require('../../../../lib/tools/neo4jImport/csv')

describe('getHeaders', () => {
  it('returns correct headers for "resource"', () => {
    const headers = getHeaders('resource')
    assert.deepEqual(headers, [])
  })
})
