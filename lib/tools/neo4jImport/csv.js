const assert = require('assert')
const {
  get, zip, includes, omit,
  cloneDeep, unzip
} = require('lodash')

const { getSchemaObject } = require('../../util/json')

// const splitIntoItems = s => parseCsv(s)[0]
// const joinItems = i => generateCsv([i]).replace(/\n$/, '')

const asInt = v => parseInt(v, 10)
const asFloat = v => parseFloat(v)
const asBoolean = v => Boolean(v)
const asString = v => v // .replace(/\\n/g, '\n')

const splitArray = v => v.split(';')
const asStringArray = splitArray

const joinArray = v => v.join(';')
const escapeString = v => v // .replace(/\n/g, '\\n')


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

const ReverseGeneralRulesToProperties = {
  id: 'ID',
  startId: 'START_ID',
  endId: 'END_ID',
  labels: 'LABEL',
  type: 'TYPE'
}

const parseWithType = (item, type) => {
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

const serializeWithType = (item, type) => {
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

const getTypeForProperty = (propName, schemaUri) => {
  const schema = getSchemaObject(schemaUri)
  let meta = get(schema.properties, propName)
  if (!meta) {
    const matchingKeys = Object.keys(schema.properties).filter(k => propName.startsWith(k))
    if (matchingKeys.length === 0) throw new Error(`Could not find property schema for "${propName}" in ${schemaUri}`)
    if (matchingKeys.length > 1) throw new Error(`More than one property schema found for "${propName}" in ${schemaUri}: ${matchingKeys}`)
    meta = schema.properties[matchingKeys[0]]
  }
  let metaType = meta.type === 'object' ? Object.values(meta.patternProperties)[0] : meta.type
  const isArrayType = metaType === 'array'
  metaType = isArrayType ? meta.items.type : metaType

  if (metaType === 'number') return isArrayType ? 'float[]' : 'float'
  if (metaType === 'integer') return isArrayType ? 'int[]' : 'int'
  if (metaType === 'boolean') return isArrayType ? 'boolean[]' : 'boolean'
  return isArrayType ? 'string[]' : 'string'
}

const HeaderItemRegex = /([^:]*):([^(]+)(\((.+)\))?/

function parseHeader(headerItems) {
  if (headerItems === undefined) return undefined

  return headerItems.map(i => {
    const match = i.match(HeaderItemRegex)
    if (!match) throw new Error(`Could not parse header item "${i}"`)
    const [, propName, propType, , space] = match
    return [
      propName === '' ? undefined : propName,
      propType,
      space
    ]
  })
}

/**
 * https://neo4j.com/docs/operations-manual/current/tools/import/file-header-format
 */
class CsvService {
  constructor(jsonSchemaUri, header) {
    assert.ok(jsonSchemaUri !== undefined, 'Schema must be provided')
    this.rules = parseHeader(header) || []
    this.schemaUri = jsonSchemaUri
  }

  loadRulesFromHeader(header) {
    this.rules = parseHeader(header) || []
  }

  parseRow(rowItems) {
    const { rules } = this
    assert(
      rules.length >= rowItems.length,
      `Row items (${rowItems}) length (${rowItems.length}) is greater than rules (${this.serializeHeader()}) length (${rules.length}) for type "${this.schemaUri}"`
    )

    return zip(rowItems, rules).reduce((acc, [item, rule]) => {
      if (item === undefined) return acc

      const [ruleProperty, ruleType, space] = rule
      const value = parseWithType(item, ruleType)

      if (ruleProperty === undefined) {
        acc[GeneralRulesToProperties[ruleType]] = value
      } else {
        acc.properties[ruleProperty] = value
      }

      if (space !== undefined) {
        acc.spaces[GeneralRulesToProperties[ruleType]] = space
      }

      return acc
    }, { properties: {}, spaces: {} })
  }

  serializeItem(item) {
    const { rules } = this

    const itemCopy = omit(cloneDeep(item), ['properties', 'spaces'])
    const itemPropsCopy = cloneDeep(item.properties)

    const lineItemsWithExistingRules = rules
      .map(([rulePropName, ruleType]) => {
        let value
        let space
        // general property
        if (ruleType in GeneralRulesToProperties) {
          const propName = GeneralRulesToProperties[ruleType]
          value = itemCopy[propName]
          space = get(item, 'spaces', {})[propName]
          delete itemCopy[propName]
        } else {
          value = itemPropsCopy[rulePropName]
          delete itemPropsCopy[rulePropName]
        }

        const serializedValue = value === undefined
          ? value
          : serializeWithType(value, ruleType)
        return [serializedValue, [rulePropName, ruleType, space]]
      })

    const newLineItemsGeneral = Object.keys(itemCopy)
      .map(propName => {
        const value = itemCopy[propName]
        const type = ReverseGeneralRulesToProperties[propName]
        const space = get(item, 'spaces', {})[propName]

        const serializedValue = value === undefined
          ? value
          : serializeWithType(value, type)
        return [serializedValue, [undefined, type, space]]
      })

    const newLineItemsSpecific = Object.keys(itemPropsCopy)
      .map(propName => {
        const value = itemPropsCopy[propName]
        const type = getTypeForProperty(propName, this.schemaUri)
        const serializedValue = value === undefined
          ? value
          : serializeWithType(value, type)
        return [serializedValue, [propName, type]]
      })

    const lineItemsWithRules = lineItemsWithExistingRules
      .concat(newLineItemsGeneral)
      .concat(newLineItemsSpecific)
    const [rowItems, updatedRules] = unzip(lineItemsWithRules)

    this.rules = updatedRules

    return rowItems
    // return joinItems(lineItems.map(i => (i === undefined ? '' : i)))
  }

  serializeHeader() {
    const { rules } = this
    return rules.map(([prop, rule, space]) => {
      const propPart = prop === undefined ? '' : prop
      const spacePart = space === undefined ? '' : `(${space})`
      return `${propPart}:${rule}${spacePart}`
    })
  }
}

module.exports = {
  CsvService
}
