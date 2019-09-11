/* eslint-env mocha */
const assert = require('assert')
const { omit } = require('lodash')
const YAML = require('yamljs')
const {
  createResourcePayloadToEntitiesAndRelationships,
  createResourcePayloadListToEntitiesAndRelationships
} = require('../../../../lib/tools/neo4jImport')

const validPayload = {
  resource: {
    type: 'external-text',
    start_date: '2019-01-01T00:00:00Z',
    end_date: '2019-01-01T23:59:59Z',
    slug: 'about-foo',
    title: {
      en: 'Foo Belval'
    },
    caption: {
      en: 'A test page about Foo'
    },
    content: {
      en: 'Content of a test page about Foo.'
    }
  },
  entities: [
    {
      type: 'location',
      name: 'Foo, Luxembourg'
    },
    {
      type: 'person',
      name: 'Bar, Luxembourg'
    }
  ],
  entitiesLocations: [
    {
      entityIndex: 0,
      languageCode: 'en',
      leftOffset: 5,
      rightOffset: 11
    },
    {
      entityIndex: 0,
      languageCode: 'en',
      leftOffset: 31,
      rightOffset: 37
    },
    {
      entityIndex: 1,
      languageCode: 'en',
      leftOffset: 68,
      rightOffset: 74
    }
  ],
  skipNER: true
}

const getExpectedResult = (
  entityUuids,
  {
    resourceStartId = 0,
    entityStartId = 0,
    versionStartId = 0
  } = {}
) => ({
  resource: [
    {
      id: resourceStartId + 1,
      labels: ['resource'],
      properties: {
        type: 'external-text',
        start_date: '2019-01-01T00:00:00Z',
        start_month: 201901,
        start_year: 2019,
        start_time: 1546300800,
        end_date: '2019-01-01T23:59:59Z',
        end_month: 201901,
        end_year: 2019,
        end_time: 1546387199,
        languages: ['en'],
        mimetype: 'text/plain',
        slug: 'about-foo',
        name: 'Foo Belval',
        title_en: 'Foo Belval',
        caption_en: 'A test page about Foo',
        content_en: 'Content of a test page about Foo.'
      }
    }
  ],
  entity: [
    {
      id: entityStartId + 1,
      labels: ['entity', 'location'],
      properties: {
        name: 'Foo, Luxembourg',
        slug: 'foo-luxembourg',
        score: 0,
        celebrity: 0,
        df: 1,
        status: 1
      }
    },
    {
      id: entityStartId + 2,
      labels: ['entity', 'person'],
      properties: {
        name: 'Bar, Luxembourg',
        slug: 'bar-luxembourg',
        score: 0,
        celebrity: 0,
        df: 1,
        status: 1
      }
    }
  ],
  appears_in: [
    {
      startId: entityStartId + 1,
      endId: resourceStartId + 1,
      labels: ['appears_in'],
      properties: {
        celebrity: 0,
        frequency: 2,
        score: 0,
        upvote: [],
        languages: ['en']
      }
    },
    {
      startId: entityStartId + 2,
      endId: resourceStartId + 1,
      labels: ['appears_in'],
      properties: {
        celebrity: 0,
        frequency: 1,
        score: 0,
        upvote: [],
        languages: ['en']
      }
    }
  ],
  version: [
    {
      id: versionStartId + 1,
      labels: ['version', 'annotation'],
      properties: {
        language: 'en',
        service: 'unknown',
        yaml: YAML.stringify([
          { id: entityUuids[0], context: { left: 5, right: 11 } },
          { id: entityUuids[0], context: { left: 31, right: 37 } },
          { id: entityUuids[1], context: { left: 68, right: 74 } },
        ])
      }
    }
  ],
  describes: [
    {
      startId: versionStartId + 1,
      endId: resourceStartId + 1,
      labels: ['describes'],
      properties: {}
    }
  ]
})


describe('createResourcePayloadToEntitiesAndRelationships', () => {
  it('creates entities from correct payload without start Ids', () => {
    const variableFields = [
      'creation_date',
      'creation_time',
      'last_modification_date',
      'last_modification_time',
      'uuid'
    ].map(f => `properties.${f}`)

    const result = createResourcePayloadToEntitiesAndRelationships(validPayload)

    const expectedResult = getExpectedResult(result.entity.map(e => e.properties.uuid))
    const testFields = ['resource', 'entity', 'appears_in', 'version', 'describes']

    testFields.forEach(k => {
      assert.deepEqual(result[k].map(v => omit(v, variableFields)), expectedResult[k])
    })
  })

  it('creates entities from correct payload with start Ids', () => {
    const variableFields = [
      'creation_date',
      'creation_time',
      'last_modification_date',
      'last_modification_time',
      'uuid'
    ].map(f => `properties.${f}`)

    const result = createResourcePayloadToEntitiesAndRelationships(validPayload, {}, {
      resource: 10,
      entity: 123,
      version: 456
    })

    const expectedResult = getExpectedResult(
      result.entity.map(e => e.properties.uuid),
      { resourceStartId: 10, entityStartId: 123, versionStartId: 456 }
    )
    const testFields = ['resource', 'entity', 'appears_in', 'version', 'describes']

    testFields.forEach(k => {
      assert.deepEqual(result[k].map(v => omit(v, variableFields)), expectedResult[k])
    })
  })

  it('creates entities from correct payload with entity ID Map', () => {
    const variableFields = [
      'creation_date',
      'creation_time',
      'last_modification_date',
      'last_modification_time',
      'uuid'
    ].map(f => `properties.${f}`)

    const result = createResourcePayloadToEntitiesAndRelationships(
      validPayload,
      {
        'location:foo-luxembourg': [789, 'abc123']
      },
      {
        resource: 10,
        entity: 123,
        version: 456
      }
    )

    const expectedResult = getExpectedResult(
      result.entity.map(e => e.properties.uuid),
      { resourceStartId: 10, entityStartId: 123, versionStartId: 456 }
    )
    expectedResult.entity[0].id = 789
    expectedResult.entity[1].id -= 1
    expectedResult.appears_in[0].startId = 789
    expectedResult.appears_in[1].startId -= 1

    const testFields = ['resource', 'entity', 'appears_in', 'version', 'describes']

    testFields.forEach(k => {
      assert.deepEqual(result[k].map(v => omit(v, variableFields)), expectedResult[k])
    })

    assert.equal(result.entity[0].properties.uuid, 'abc123')
  })
})

describe('createResourcePayloadListToEntitiesAndRelationships', () => {
  it('creates entities from correct payload without start Ids', () => {
    const variableFields = [
      'creation_date',
      'creation_time',
      'last_modification_date',
      'last_modification_time',
      'uuid'
    ].map(f => `properties.${f}`)

    const {
      results,
      entityTypeAndSlugToIdMapping,
      lastIds
    } = createResourcePayloadListToEntitiesAndRelationships([validPayload])

    const expectedResult = getExpectedResult(results.entity.map(e => e.properties.uuid))
    const testFields = ['resource', 'entity', 'appears_in', 'version', 'describes']

    testFields.forEach(k => {
      assert.deepEqual(results[k].map(v => omit(v, variableFields)), expectedResult[k])
    })

    assert.deepEqual(entityTypeAndSlugToIdMapping, {
      'location:foo-luxembourg': 1,
      'person:bar-luxembourg': 2,
    })

    assert.deepEqual(lastIds, {
      entity: 2,
      resource: 1,
      version: 1
    })
  })
})
