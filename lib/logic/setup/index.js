const {
  groupBy, differenceWith, isEqual,
  get
} = require('lodash')
const { executeQuery } = require('../../util/neo4j')
const { getLogger } = require('../../util/log')

const log = getLogger()

const UniqueContraints = [
  ['resource', 'slug'],
  ['resource', 'uuid'],

  ['entity', 'uuid'],
  ['location', 'slug'],
  ['organization', 'slug'],
  ['person', 'slug'],

  ['action', 'uuid'],
  ['version', 'uuid'],

  ['user', 'username'],
  ['user', 'uuid']
]

const toConstraintStatement = (label, field) => `CREATE CONSTRAINT ON (e:${label}) ASSERT e.${field} IS UNIQUE`

const Indexes = [
  ['resource', 'last_modification_time'],
  ['resource', 'start_year'],
  ['resource', 'start_month'],
  ['resource', 'start_time'],
  ['resource', 'end_year'],
  ['resource', 'end_month'],
  ['resource', 'end_time'],

  ['entity', 'status'],
  ['entity', 'df'],
]

const toIndexStatement = (label, field) => `CREATE INDEX ON :${label}(${field})`

const FullTextIndexes = [
  ['name', ['entity', 'resource'], ['name']],
  ['text_en', ['resource'], ['title_en', 'caption_en', 'content_en']],
  ['text_fr', ['resource'], ['title_fr', 'caption_fr', 'content_fr']],
  ['text_de', ['resource'], ['title_de', 'caption_de', 'content_de']],
]

const toFullTextIndexStatement = (name, labels, fields) => `
  CALL db.index.fulltext.createNodeIndex(${JSON.stringify(name)}, ${JSON.stringify(labels)},${JSON.stringify(fields)}, {eventually_consistent: "true"})
`

const QueryGetIndexes = 'CALL db.indexes()'

/**
 * Set up required constraints and indexes.
 * This method will check existing constraints/indexes and will configure only
 * the ones that are missing.
 */
async function setUpConstraintsAndIndexes() {
  const existingIndexes = await executeQuery(QueryGetIndexes)
  const existingIndexesByType = groupBy(existingIndexes, 'type')

  const existingUniqueConstraints = get(existingIndexesByType, 'node_unique_property', [])
    .map(i => [i.tokenNames[0], i.properties[0]])

  const existingLabelIndexes = get(existingIndexesByType, 'node_label_property', [])
    .map(i => [i.tokenNames[0], i.properties[0]])

  const existingFullTextIndexes = get(existingIndexesByType, 'node_fulltext', [])
    .map(i => [i.indexName, i.tokenNames, i.properties])

  const missingUniqueConstraints = differenceWith(
    UniqueContraints, existingUniqueConstraints, isEqual
  )
  const missingLabelIndexes = differenceWith(
    Indexes, existingLabelIndexes, isEqual
  )
  const missingFullTextIndexes = differenceWith(
    FullTextIndexes, existingFullTextIndexes, isEqual
  )

  // eslint-disable-next-line no-restricted-syntax
  for await (const args of missingUniqueConstraints) {
    const query = toConstraintStatement(...args)
    log.info(`Executing ${query}`)
    await executeQuery(query)
  }

  // eslint-disable-next-line no-restricted-syntax
  for await (const args of missingLabelIndexes) {
    const query = toIndexStatement(...args)
    log.info(`Executing ${query}`)
    await executeQuery(query)
  }

  // eslint-disable-next-line no-restricted-syntax
  for await (const args of missingFullTextIndexes) {
    const query = toFullTextIndexStatement(...args)
    log.info(`Executing ${query}`)
    await executeQuery(query)
  }
}

module.exports = {
  setUpConstraintsAndIndexes
}
