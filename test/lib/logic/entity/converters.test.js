/* eslint-env mocha */
const assert = require('assert')
const { omit } = require('lodash')
const {
  createResourcePayloadToMergeEntityList
} = require('../../../../lib/logic/entity/converters')

describe('createResourcePayloadToMergeResource', () => {
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
        end_date: '2019-01-01T00:00:00Z',
      },
      entities: [
        {
          type: 'location',
          name: 'Chicago'
        },
        {
          type: 'person',
          name: 'Schuman'
        },
      ],
      entitiesLocations: [
        {
          entityIndex: 0,
          languageCode: 'en',
          leftOffset: 0,
          rightOffset: 10
        },
        {
          entityIndex: 0,
          languageCode: 'en',
          leftOffset: 30,
          rightOffset: 40
        },
        {
          entityIndex: 1,
          languageCode: 'en',
          leftOffset: 10,
          rightOffset: 20
        },
      ]
    }

    const testResourceUuid = 'test123'

    const expectedMergeEntitiesList = [
      {
        resource_uuid: testResourceUuid,
        slug: 'chicago',
        type: 'location',
        name: 'Chicago',
        languages: ['en'],
        frequency: 2
      },
      {
        resource_uuid: testResourceUuid,
        slug: 'schuman',
        type: 'person',
        name: 'Schuman',
        languages: ['en'],
        frequency: 1
      },
    ]

    const variableFields = ['exec_date', 'exec_time', 'uuid']

    const mergeEntitiesList = createResourcePayloadToMergeEntityList(
      validCreateResourcePayload, testResourceUuid
    )

    assert.deepEqual(
      mergeEntitiesList.map(e => omit(e, variableFields)),
      expectedMergeEntitiesList
    )
  })

  it('fails on invalid payload', () => {
    const invalidPayload = {
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
        end_date: '2019-01-01T00:00:00Z',
      },
      entities: [
        {
          type: 'location',
          name: 'Chicago'
        },
        {
          type: 'person',
          name: 'Schuman'
        },
      ],
      entitiesLocations: [
        {
          languageCode: 'en',
          leftOffset: 0,
          rightOffset: 10
        },
      ]
    }

    try {
      createResourcePayloadToMergeEntityList(invalidPayload, 'x')
      assert.fail('Expected to raise an error')
    } catch (e) {
      assert.equal(e.message, 'JSON validation errors: data.entitiesLocations[0] should have required property \'entityIndex\'')
    }
  })
})
