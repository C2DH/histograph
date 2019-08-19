/* eslint-env mocha */
const assert = require('assert')
const { toNeo4jJson } = require('../../../lib/converters/db')

describe('toNeo4jJson', () => {
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

    const neo4jJson = toNeo4jJson(testJson, { separators: { content: '_' } })
    assert.deepEqual(neo4jJson, expectedNeo4jObject)
  })
})
