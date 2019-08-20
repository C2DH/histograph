/* eslint-env mocha */
const assert = require('assert')
const { toNeo4jJson, fromNeo4jJson } = require('../../../lib/converters/db')

describe('toNeo4jJson and fromNeo4jJson', () => {
  it('converts with default rules', () => {
    const testJson = {
      foo: {
        bar: {
          bazOne: 1,
          bazTwo: 'two'
        }
      },
      test: 'string'
    }
    const expectedNeo4jObject = {
      foo__bar__bazOne: 1,
      foo__bar__bazTwo: 'two',
      test: 'string'
    }

    const neo4jJson = toNeo4jJson(testJson)
    assert.deepEqual(neo4jJson, expectedNeo4jObject)

    assert.deepEqual(fromNeo4jJson(neo4jJson), testJson)
  })

  it('converts with override rules', () => {
    const testJson = {
      content: {
        en: 'Content',
        fr: 'Contenue'
      },
      links: {
        wikipedia: 'http://example.com'
      },
      something: ['else']
    }
    const expectedNeo4jObject = {
      content_en: 'Content',
      content_fr: 'Contenue',
      links__wikipedia: 'http://example.com',
      something: ['else']
    }

    const options = { separators: { content: '_' } }

    const neo4jJson = toNeo4jJson(testJson, options)
    assert.deepEqual(neo4jJson, expectedNeo4jObject)

    assert.deepEqual(fromNeo4jJson(neo4jJson, options), testJson)
  })
})
