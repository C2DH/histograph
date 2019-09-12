const assert = require('assert')
const {
  get, zip, includes, omit,
  difference, isEmpty
} = require('lodash')

const parseCsv = require('csv-parse/lib/sync')
const generateCsv = require('csv-generate/lib/sync')

const splitIntoItems = s => parseCsv(s)[0]
const joinItems = i => generateCsv(i)[0]

const asInt = v => parseInt(v, 10)
const asFloat = v => parseFloat(v)
const asBoolean = v => Boolean(v)
const asString = v => v

const splitArray = v => v.split(';')
const asStringArray = splitArray

const joinArray = v => v.join(';')
const escapeString = v => v


const FloatTypes = ['float', 'double']
const IntTypes = ['int', 'long']
const BooleanTypes = ['boolean']

const FloatArrayTypes = FloatTypes.map(t => `${t}[]`)
const IntArrayTypes = FloatTypes.map(t => `${t}[]`)
const BooleanArrayTypes = FloatTypes.map(t => `${t}[]`)
const StringArrayTypes = ['string'].map(t => `${t}[]`)

const GeneralRulesToProperties = {
  ID: 'id',
  START_ID: 'startId',
  END_ID: 'endId',
  LABEL: 'labels',
  TYPE: 'type'
}

const parseWithType = (type, item) => {
  if (type === 'ID') return asInt(item)
  if (type === 'START_ID') return asInt(item)
  if (type === 'END_ID') return asInt(item)
  if (type === 'LABEL') return asStringArray(item)
  if (type === 'TYPE') return asString(item)
  if (includes(FloatTypes, type)) return asFloat(item)
  if (includes(IntTypes, type)) return asInt(item)
  if (includes(BooleanTypes, type)) return asBoolean(item)
  if (includes(FloatArrayTypes, type)) return splitArray(item).map(asFloat)
  if (includes(IntArrayTypes, type)) return splitArray(item).map(asInt)
  if (includes(BooleanArrayTypes, type)) return splitArray(item).map(asBoolean)
  if (includes(StringArrayTypes, type)) return splitArray(item).map(asString)
  return asString(item)
}

const serializeWithType = (type, item) => {
  if (type === 'ID') return String(item)
  if (type === 'START_ID') return String(item)
  if (type === 'END_ID') return String(item)
  if (type === 'LABEL') return joinArray(item.map(String))
  if (type === 'TYPE') return String(item)
  if (includes(FloatTypes, type)) return String(item)
  if (includes(IntTypes, type)) return String(item)
  if (includes(BooleanTypes, type)) return String(item)
  if (includes(FloatArrayTypes, type)) return joinArray(item.map(String))
  if (includes(IntArrayTypes, type)) return joinArray(item.map(String))
  if (includes(BooleanArrayTypes, type)) return joinArray(item.map(String))
  if (includes(StringArrayTypes, type)) return joinArray(item.map(escapeString))
  return escapeString(item)
}

/**
 * https://neo4j.com/docs/operations-manual/current/tools/import/file-header-format
 */
class CsvService {
  constructor() {
    this.rules = {}
  }

  parseLine(line, type) {
    const rules = get(this.rules, type, [])
    const lineItems = splitIntoItems(line)
    assert(
      rules.length === lineItems.length,
      `Line items (${lineItems}) length is different from rules (${rules}) length for type "${type}"`
    )

    return zip(lineItems, rules).reduce((acc, [item, rule]) => {
      const [ruleProperty, ruleType] = rule
      const value = parseWithType(ruleType, item)

      if (ruleProperty === undefined) {
        acc[GeneralRulesToProperties[ruleType]] = value
      } else {
        acc.properties[ruleProperty] = value
      }
      return acc
    }, { properties: {} })
  }

  serializeItem(item, type) {
    const rules = get(this.rules, type, [])
    const generalProperties = rules
      .filter(([prop]) => prop === undefined)
      .map(([, t]) => GeneralRulesToProperties[t])
      .sort()

    const specificProperties = rules
      .filter(([prop]) => prop !== undefined)
      .map(([prop]) => prop)
      .sort()

    const itemGeneralProperties = omit(Object.keys(item).sort(), 'properties')
    const itemSpecificProperties = Object.keys(item.properties).sort()

    const generalPropertiesWithoutRules = difference(generalProperties, itemGeneralProperties)
    assert.ok(isEmpty(generalPropertiesWithoutRules), `General properties without rules found: ${generalPropertiesWithoutRules}`)

    const specificPropertiesWithoutRules = difference(specificProperties, itemSpecificProperties)
    assert.ok(isEmpty(specificPropertiesWithoutRules), `Specific properties without rules found: ${specificPropertiesWithoutRules}`)

    const lineItems = rules.map(([prop, t]) => {
      const val = prop === undefined
        ? item[GeneralRulesToProperties[t]]
        : item.properties[prop]
      return serializeWithType(t, val)
    })
    return joinItems(lineItems)
  }

  addRules(type, rules) {
    this.rules[type] = rules
  }
}

module.exports = {
  CsvService
}
