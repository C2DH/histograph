/* eslint-env mocha */
const assert = require('assert')
const { omit } = require('lodash')

const {
  createResourcePayloadToEntityAndAppearanceList
} = require('../../../../lib/logic/entity/converters')

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

describe('createResourcePayloadToEntityAndAppearanceList', () => {
  it('converts valid payload', () => {
    const expectedMergeEntitiesList = [
      {
        entity: {
          slug: 'chicago',
          name: 'Chicago',
        },
        appearance: {
          languages: ['en'],
          frequency: 2,
          context: {
            en: [[0, 10], [30, 40]]
          }
        },
        type: 'location'
      },
      {
        entity: {
          slug: 'schuman',
          name: 'Schuman',
        },
        appearance: {
          languages: ['en'],
          frequency: 1,
          context: {
            en: [[10, 20]]
          }
        },
        type: 'person',
      }
    ]

    const variableFields = ['uuid']

    const mergeEntitiesList = createResourcePayloadToEntityAndAppearanceList(
      validCreateResourcePayload
    )

    assert.deepEqual(
      mergeEntitiesList.map(e => {
        e.entity = omit(e.entity, variableFields)
        return e
      }),
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
      createResourcePayloadToEntityAndAppearanceList(invalidPayload)
      assert.fail('Expected to raise an error')
    } catch (e) {
      assert.equal(e.message, 'JSON validation errors: "entitiesLocations[0].entityIndex": missing required property')
    }
  })
})
