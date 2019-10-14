/* eslint-env mocha */
const assert = require('assert')
const { validated, formatValidationErrors } = require('../../../lib/util/json')

const validateTestsValid = {
  'db.resource': {
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
      iiif_url: './foo/bar/info.json'
    },
    schemaUri: 'db/resource.json',
  },
  'db.entity': {
    testJson: {
      slug: 'chicago',
      uuid: 'abc123',
      name: 'Chicago',
      entity: {
        ned_model: 'test',
        ned_id: 'chicago-id'
      },
      links: {
        wikidata_id: '123'
      }
    },
    schemaUri: 'db/entity.json'
  },
  'db.appears_in': {
    testJson: {
      frequency: 1,
      languages: ['en']
    },
    schemaUri: 'db/appears_in.json'
  },
  'api.management.create_resource.payload': {
    testJson: {
      resource: {
        start_date: '2019-01-01T00:00:00Z',
        end_date: '2019-12-31T00:00:00Z',
        title: {
          en: 'Test resource'
        },
        caption: {
          en: 'This is a test resource'
        },
        content: {
          en: 'Content of the test resource'
        }
      },
      skipNER: true,
      entities: [
        {
          type: 'location',
          name: 'Test'
        }
      ],
      entitiesLocations: [
        {
          entityIndex: 0,
          languageCode: 'en',
          leftOffset: 5,
          rightOffset: 10
        }
      ]
    },
    schemaUri: 'api/management/create_resource/payload.json'
  }
}

const validateTestsInvalid = {
  'db.resource': {
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
    schemaUri: 'db/resource.json',
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
  'db.entity': {
    testJson: {
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
      unknownfield: 'test'
    },
    schemaUri: 'db/entity.json',
    expectedErrors: [
      ['type', 'unexpected additional property'],
      ['unknownfield', 'unexpected additional property'],
      ['slug', 'should match pattern "^[^\\s]+$"'],
      ['entity.asdf', 'unexpected additional property'],
      ['links.wikipedia_uri', 'should match format "uri"'],
    ]
  },
  'db.appears_in': {
    testJson: {
      frequency: 'asdf',
      languages: ['en'],
      unknownfield: 'test'
    },
    schemaUri: 'db/appears_in.json',
    expectedErrors: [
      ['unknownfield', 'unexpected additional property'],
      ['frequency', 'should be integer']
    ]
  },
  'api.management.create_resource.payload': {
    testJson: {
      resource: {
        start_date: '2019-01-01T00:00:00Z',
        end_date: '2019-12-31T00:00:00Z',
        title: {
          en: 'Test resource'
        },
        caption: {
          en: 'This is a test resource'
        },
        content: 'Content of the test resource',
        unk: 1
      },
      skipNER: 1,
      entities: [
        {
          name: 'Test'
        }
      ],
      entitiesLocations: [
        {
          entityIndex: 0,
          languageCode: 'en',
          leftOffset: 5,
          foo: 'bar'
        },
        1
      ]
    },
    schemaUri: 'api/management/create_resource/payload.json',
    expectedErrors: [
      ['resource.unk', 'unexpected additional property'],
      ['resource.content', 'should be object'],
      ['skipNER', 'should be boolean'],
      ['entities[0].type', 'missing required property'],
      ['entitiesLocations[0].rightOffset', 'missing required property'],
      ['entitiesLocations[1]', 'should be object']
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
