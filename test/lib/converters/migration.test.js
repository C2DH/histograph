/* eslint-env mocha */
const assert = require('assert')
const { contextYamlToContexts } = require('../../../lib/converters/migration')

const TestYaml = `
- id: eXnDMO9E_
  context: {left: 0, right: 30}
- id: eXnDMO9E_
  context: {left: 30, right: 60}
- id: dZOMM_7nSE
  context: {left: 1079, right: 1091}
`

describe('contextYamlToContexts', () => {
  it('converts proper Yaml context string', () => {
    const items = contextYamlToContexts(TestYaml)
    const expectedItems = [
      ['eXnDMO9E_', [[0, 30], [30, 60]]],
      ['dZOMM_7nSE', [[1079, 1091]]]
    ]
    assert.deepEqual(items, expectedItems)
  })
})
