/* eslint-env mocha */
const assert = require('assert')
const { uniq, zip } = require('lodash')
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

  it('converts with modifiers', () => {
    const serializerOptions = {
      modifiers: {
        context: (key, contextObject, separator) => Object.keys(contextObject)
          .reduce((newObj, languageCode) => {
            const contextPairs = contextObject[languageCode]
            // eslint-disable-next-line no-param-reassign
            newObj[`${key}${separator}${languageCode}${separator}starts`] = contextPairs.map(([start]) => start)
            // eslint-disable-next-line no-param-reassign
            newObj[`${key}${separator}${languageCode}${separator}ends`] = contextPairs.map(([, end]) => end)
            return newObj
          }, {})
      }
    }

    const deserializerOptions = {
      modifiers: {
        context: (key, contextObject, separator) => {
          const languageCodes = uniq(Object.keys(contextObject)
            .map(k => k.split(separator)[1]))

          const context = languageCodes.reduce((newObj, languageCode) => {
            const starts = contextObject[`${key}${separator}${languageCode}${separator}starts`] || []
            const ends = contextObject[`${key}${separator}${languageCode}${separator}ends`] || []
            assert.ok(starts.length === ends.length, `Start and end lists for language ${languageCode} must be of the same size`)
            // eslint-disable-next-line no-param-reassign
            newObj[languageCode] = zip(starts, ends)
            return newObj
          }, {})

          return { [key]: context }
        }
      }
    }

    const inputObject = {
      foo: {
        bar: 'baz'
      },
      bang: 1,
      context: {
        en: [[3, 10], [16, 23]],
        fr: [[3, 10]],
      }
    }
    const expectedNeo4jObject = {
      foo__bar: 'baz',
      bang: 1,
      context__en__starts: [3, 16],
      context__en__ends: [10, 23],
      context__fr__starts: [3],
      context__fr__ends: [10],
    }

    const neo4jJson = toNeo4jJson(inputObject, serializerOptions)
    assert.deepEqual(neo4jJson, expectedNeo4jObject)

    const reconstructedObject = fromNeo4jJson(neo4jJson, deserializerOptions)
    assert.deepEqual(reconstructedObject, inputObject)
  })
})
