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
