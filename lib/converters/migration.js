const { groupBy, toPairs, uniqBy } = require('lodash')
const YAML = require('yamljs')

function contextYamlToContexts(yamlString) {
  const yamlContext = YAML.parse(yamlString)
  return toPairs(groupBy(yamlContext, 'id'))
    .map(([entityUuid, items]) => [
      entityUuid,
      uniqBy(items.map(({ context: { left, right } }) => [left, right]), JSON.stringify)
    ])
}

module.exports = { contextYamlToContexts }
