/* eslint-env mocha */
const assert = require('assert')
const mock = require('mock-require')

describe('createAction', () => {
  it('creates, performs and updates "unlink-entity" action', async () => {
    try {
      let queryCounter = 0
      let savedAction
      const resourceIdentifier = { name: 'Test Resource', slug: 'r1' }
      const entityIdentifier = { name: 'Test Entity', type: 'location', slug: 'e1' }

      mock('../../../../lib/util/neo4j', {
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
      assert.equal(action, savedAction)
      assert.deepEqual(results, [
        ['Entity (123) is unlinked from resource (456)', true]
      ])
    } finally {
      mock.stopAll()
    }
  })
})
