/* eslint-env mocha */
const assert = require('assert')
const mock = require('mock-require')
const { createAction } = require('../../../../lib/logic/actions')

describe('createAction', () => {
  it('creates, performs and updates "unlink-entity" action', async () => {
    const {
      action,
      performed,
      results
    } = await createAction('unlink-entity', { entityUuid: 'e', resourceUuid: 'r' }, 'test user', 1)

  })
})
