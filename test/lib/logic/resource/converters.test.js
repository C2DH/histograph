/* eslint-env mocha */
const assert = require('assert')
const { omit } = require('lodash')
const {
  createResourcePayloadToResource
} = require('../../../../lib/logic/resource/converters')

describe('createResourcePayloadToResource', () => {
  it('converts valid payload', () => {
    const validCreateResourcePayload = {
      resource: {
        title: {
          en: 'Test resource'
        },
        caption: {
          en: 'Test resource caption'
        },
        content: {
          en: 'This is a textual test resource about absolutely nothing. It spans a whole year.'
        },
        start_date: '2018-01-01T00:00:00Z',
        end_date: '2019-01-01T00:00:00Z'
      }
    }

    const expectedResourceObject = {
      caption: validCreateResourcePayload.resource.caption,
      content: validCreateResourcePayload.resource.content,
      title: validCreateResourcePayload.resource.title,
      type: 'external-text',
      mimetype: 'text/plain',
      languages: ['en'],
      name: validCreateResourcePayload.resource.title.en,
      slug: 'test-resource',
      start_date: validCreateResourcePayload.resource.start_date,
      start_time: Date.parse(validCreateResourcePayload.resource.start_date) / 1000,
      start_month: '201801',
      start_year: '2018',
      end_date: validCreateResourcePayload.resource.end_date,
      end_time: Date.parse(validCreateResourcePayload.resource.end_date) / 1000,
      end_month: '201901',
      end_year: '2019',
    }

    const variableFields = ['uuid']

    const resourceObject = createResourcePayloadToResource(validCreateResourcePayload)
    assert.deepEqual(omit(resourceObject, variableFields), expectedResourceObject)
  })

  it('fails on invalid payload', () => {
    const invalidPayload = {
      resource: {
        title: {
          en: 'Test resource'
        },
        caption: {
          fr: 'Test'
        },
        content: {
          en: 'This is a textual test resource about absolutely nothing. It spans a whole year.'
        },
        start_date: '2018-01-01T00:00:00Z',
        end_date: '2019-01-01T00:00:00Z',
      }
    }

    try {
      createResourcePayloadToResource(invalidPayload)
      assert.fail('Expected to raise an error')
    } catch (e) {
      assert.equal(e.message, 'Some languages are not matched in title/caption/content: en, fr')
    }
  })
})
