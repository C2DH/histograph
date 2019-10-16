/* eslint-env mocha */
const assert = require('assert')
const mock = require('mock-require')
const {
  fromNeo4jChangeAction,
  toNeo4jAppearance,
  fromNeo4jAppearance
} = require('../../../../lib/converters/db')

const Neo4jModulePath = '../../../../lib/util/neo4j'

const clearRequireCache = () => Object.keys(require.cache).forEach(key => {
  delete require.cache[key]
})

describe('createAction', () => {
  it('creates, performs and updates "unlink-entity" action', async () => {
    try {
      let queryCounter = 0
      let savedAction
      const resourceIdentifier = { name: 'Test Resource', slug: 'r1' }
      const entityIdentifier = { name: 'Test Entity', type: 'location', slug: 'e1' }

      mock(Neo4jModulePath, {
        async executeQuery(query, params) {
          queryCounter += 1
          switch (queryCounter) {
            case 1:
              return [{ resourceIdentifier, entityIdentifier }]
            case 2:
              savedAction = {
                ...params.action,
                createdAt: new Date().toISOString()
              }
              return [savedAction]
            case 3:
              return [{ entityUuid: '123', resourceUuid: '456', appearanceId: 123 }]
            case 4:
              savedAction = {
                ...savedAction,
                performedAt: new Date().toISOString()
              }
              return [savedAction]
            default:
              return undefined
          }
        }
      })

      const { createAction } = mock.reRequire('../../../../lib/logic/actions')

      const {
        action,
        performed,
        results
      } = await createAction('unlink-entity', { entityUuid: 'e1', resourceUuid: 'r1' }, 'test user', 1)
      assert.equal(performed, true)
      assert.deepEqual(action, fromNeo4jChangeAction(savedAction))
      assert.deepEqual(results, [
        ['Entity (123) is unlinked from resource (456)', true]
      ])
    } finally {
      mock.stop(Neo4jModulePath)
      clearRequireCache()
    }
  })

  it('creates, performs and updates "link-entity" action when no link exists', async () => {
    try {
      let queryCounter = 0
      let savedAction
      const resourceIdentifier = { name: 'Test Resource', slug: 'r1' }
      const entityIdentifier = { name: 'Test Entity', type: 'location', slug: 'e1' }

      mock(Neo4jModulePath, {
        async executeQuery(query, params) {
          queryCounter += 1
          switch (queryCounter) {
            case 1:
              return [{ resourceIdentifier, entityIdentifier }]
            case 2:
              savedAction = {
                ...params.action,
                createdAt: new Date().toISOString()
              }
              return [savedAction]
            case 3:
              // existing `appears_in`
              return []
            case 4:
              return [{ entityUuid: '123', resourceUuid: '456', appearanceId: 123 }]
            case 5:
              savedAction = {
                ...savedAction,
                performedAt: new Date().toISOString()
              }
              return [savedAction]
            default:
              return undefined
          }
        }
      })

      const { createAction } = mock.reRequire('../../../../lib/logic/actions')

      const details = { entityUuid: 'e1', resourceUuid: 'r1', context: { en: [[2, 5]] } }
      const {
        action,
        performed,
        results
      } = await createAction('link-entity', details, 'test user', 1)
      assert.equal(performed, true)
      assert.deepEqual(action, fromNeo4jChangeAction(savedAction))
      assert.deepEqual(results, [
        ['Entity (123) is linked to resource (456)', true]
      ])
    } finally {
      mock.stop(Neo4jModulePath)
      clearRequireCache()
    }
  })

  it('creates, performs and updates "link-entity" action when link already exists', async () => {
    try {
      let queryCounter = 0
      let savedAction
      const resourceIdentifier = { name: 'Test Resource', slug: 'r1' }
      const entityIdentifier = { name: 'Test Entity', type: 'location', slug: 'e1' }

      mock(Neo4jModulePath, {
        async executeQuery(query, params) {
          queryCounter += 1
          switch (queryCounter) {
            case 1:
              return [{ resourceIdentifier, entityIdentifier }]
            case 2:
              savedAction = {
                ...params.action,
                createdAt: new Date().toISOString()
              }
              return [savedAction]
            case 3:
              // existing `appears_in`
              return [toNeo4jAppearance({
                context: {
                  en: [[10, 20]],
                  fr: [[4, 8]]
                },
                languages: ['en', 'fr']
              })]
            case 4:
              assert.deepEqual(fromNeo4jAppearance(params.appearance).context, {
                en: [[2, 5], [10, 20]],
                fr: [[4, 8]]
              })
              assert.deepEqual(fromNeo4jAppearance(params.appearance).languages, ['en', 'fr'])
              return [{ entityUuid: '123', resourceUuid: '456', appearanceId: 123 }]
            case 5:
              savedAction = {
                ...savedAction,
                performedAt: new Date().toISOString()
              }
              return [savedAction]
            default:
              return undefined
          }
        }
      })

      const { createAction } = mock.reRequire('../../../../lib/logic/actions')

      const details = { entityUuid: 'e1', resourceUuid: 'r1', context: { en: [[2, 5]] } }
      const {
        action,
        performed,
        results
      } = await createAction('link-entity', details, 'test user', 1)
      assert.equal(performed, true)
      assert.deepEqual(action, fromNeo4jChangeAction(savedAction))
      assert.deepEqual(action.meta.context, details.context)

      assert.deepEqual(results, [
        ['Entity (123) is linked to resource (456)', true]
      ])
    } finally {
      mock.stop(Neo4jModulePath)
      clearRequireCache()
    }
  })

  it('creates, performs and updates "change-entity-type" action', async () => {
    try {
      let queryCounter = 0
      let savedAction
      const entityIdentifier = { name: 'Test Entity', type: 'location', slug: 'e1' }

      mock(Neo4jModulePath, {
        async executeQuery(query, params) {
          queryCounter += 1
          switch (queryCounter) {
            case 1:
              return [entityIdentifier]
            case 2:
              savedAction = {
                ...params.action,
                createdAt: new Date().toISOString()
              }
              return [savedAction]
            case 3:
              return [{ uuid: '123' }]
            case 4:
              savedAction = {
                ...savedAction,
                performedAt: new Date().toISOString()
              }
              return [savedAction]
            default:
              return undefined
          }
        }
      })

      const { createAction } = mock.reRequire('../../../../lib/logic/actions')

      const {
        action,
        performed,
        results
      } = await createAction('change-entity-type', { entityUuid: 'e1', newType: 'person' }, 'test user', 1)
      assert.equal(performed, true)
      assert.deepEqual(action, fromNeo4jChangeAction(savedAction))
      assert.deepEqual(results, [
        ['Entity (123) type has been changed from "location" to "person"', true]
      ])
    } finally {
      mock.stop(Neo4jModulePath)
      clearRequireCache()
    }
  })
})
