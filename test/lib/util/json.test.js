/* eslint-env mocha */
const assert = require('assert')
const { validated, formatValidationErrors } = require('../../../lib/util/json')

const validateTestsValid = {
  'mutations.merge_resource': {
    testJson: {
      slug: 'moo',
      uuid: 'abc123',
      name: 'test',
      mimetype: 'text',
      languages: ['en'],
      type: 'text',
      creation_date: new Date().toISOString(),
      creation_time: Date.now(),
      url: {
        en: '/foo/bar.txt'
      },
      iif_url: './foo/bar/info.json'
    },
    schemaUri: 'mutations/merge_resource.json',
  },
  'mutations.merge_entity': {
    testJson: {
      resource_uuid: 'resabc123',
      slug: 'chicago',
      type: 'location',
      uuid: 'abc123',
      name: 'Chicago',
      exec_date: new Date().toISOString(),
      exec_time: Date.now(),
      entity: {
        ned_model: 'test',
        ned_id: 'chicago-id'
      },
      links: {
        wikidata_id: '123'
      },
      frequency: 1,
      languages: ['en'],
      username: 'moo'
    },
    schemaUri: 'mutations/merge_entity.json'
  },
  'mutations.merge_relationship_resource_version': {
    testJson: {
      resource_id: 123,
      service: 'test-ned',
      language: 'en',
      yaml: '...',
      creation_date: new Date().toISOString(),
      creation_time: Date.now(),
    },
    schemaUri: 'mutations/merge_relationship_resource_version.json'
  }
}

const validateTestsInvalid = {
  'mutations.merge_resource': {
    testJson: {
      uuid: 'abc123',
      name: 'test',
      mimetype: 'text',
      languages: ['asdf'],
      type: 'text',
      creation_date: 'boo',
      creation_time: '1',
      unknown: 'bar',
      another: 1,
      url: {
        en: 1,
        fra: 'o'
      }
    },
    schemaUri: 'mutations/merge_resource.json',
    expectedErrors: [
      ['unknown', 'unexpected additional property'],
      ['another', 'unexpected additional property'],
      ['slug', 'missing required property'],
      ['languages[0]', 'should match pattern "^[a-z]{2}$"'],
      ['url[\'fra\']', 'invalid property name: should match pattern "^[a-z]{2}$"'],
      ['url[\'en\']', 'should be string'],
      ['creation_date', 'should match format "date-time"'],
      ['creation_time', 'should be integer']
    ]
  },
  'mutations.merge_entity': {
    testJson: {
      resource_uuid: 'resabc 123',
      slug: 'chica go',
      type: 'location',
      uuid: 'abc123',
      name: 'Chicago',
      entity: {
        asdf: 'test',
        ned_id: 'chicago-id'
      },
      links: {
        wikipedia_uri: '123'
      },
      frequency: 'asdf',
      languages: ['en'],
      username: 'moo',
      unknownfield: 'test'
    },
    schemaUri: 'mutations/merge_entity.json',
    expectedErrors: [
      ['unknownfield', 'unexpected additional property'],
      ['resource_uuid', 'should match pattern "^[^\\s]+$"'],
      ['slug', 'should match pattern "^[^\\s]+$"'],
      ['entity.asdf', 'unexpected additional property'],
      ['links.wikipedia_uri', 'should match format "uri"'],
      ['exec_date', 'missing required property'],
      ['exec_time', 'missing required property'],
      ['frequency', 'should be integer']
    ]
  },
  'mutations.merge_relationship_resource_version': {
    testJson: {
      resource_id: '123',
      language: ['en'],
      foo: 'bar'
    },
    schemaUri: 'mutations/merge_relationship_resource_version.json',
    expectedErrors: [
      ['foo', 'unexpected additional property'],
      ['resource_id', 'should be integer'],
      ['service', 'missing required property'],
      ['language', 'should be string'],
      ['yaml', 'missing required property'],
      ['creation_date', 'missing required property'],
      ['creation_time', 'missing required property']
    ]
  }
}

describe('validate', () => {
  describe('pass validation', () => {
    // eslint-disable-next-line mocha/no-setup-in-describe
    Object.keys(validateTestsValid).forEach(key => {
      it(key, () => {
        const { testJson, schemaUri } = validateTestsValid[key]
        const json = validated(testJson, schemaUri)
        assert.deepEqual(json, testJson)
      })
    })
  })

  describe('do not pass validation', () => {
    // eslint-disable-next-line mocha/no-setup-in-describe
    Object.keys(validateTestsInvalid).forEach(key => {
      it(key, () => {
        const { testJson, schemaUri, expectedErrors } = validateTestsInvalid[key]
        try {
          validated(testJson, schemaUri)
          // eslint-disable-next-line no-undef
          assert.fail('Should not have thrown')
        } catch (e) {
          if (expectedErrors) {
            assert.deepEqual(formatValidationErrors(e.errors), expectedErrors)
          }
          // console.log(e.errors)
        }
      })
    })
  })
})
