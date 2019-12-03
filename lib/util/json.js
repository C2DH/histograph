const Ajv = require('ajv')
const { get } = require('lodash')

const ajv = new Ajv({ allErrors: true, strictKeywords: true })

ajv.addSchema(require('../../schema/json/db/resource.json'))
ajv.addSchema(require('../../schema/json/db/entity.json'))
ajv.addSchema(require('../../schema/json/db/appears_in.json'))
ajv.addSchema(require('../../schema/json/db/change_action.json'))

ajv.addSchema(require('../../schema/json/api/management/create_resource/payload.json'))

ajv.addSchema(require('../../schema/json/change_actions/common.json'))
ajv.addSchema(require('../../schema/json/change_actions/link-entity.json'))
ajv.addSchema(require('../../schema/json/change_actions/unlink-entity.json'))
ajv.addSchema(require('../../schema/json/change_actions/change-entity-type.json'))
ajv.addSchema(require('../../schema/json/change_actions/merge-entities.json'))
ajv.addSchema(require('../../schema/json/change_actions/unlink-entity-bulk.json'))
ajv.addSchema(require('../../schema/json/change_actions/link-entity-bulk.json'))

const BaseSchemaURI = 'http://c2dh.uni.lu/histograph'


function formatValidationErrors(errors) {
  return (errors || []).map(error => {
    const dataPath = error.dataPath.startsWith('.') ? error.dataPath.slice(1) : error.dataPath

    if (error.keyword === 'additionalProperties') {
      const currentPath = dataPath ? `${dataPath}.${error.params.additionalProperty}` : error.params.additionalProperty
      return [currentPath, 'unexpected additional property']
    }
    if (error.keyword === 'required') {
      const currentPath = dataPath ? `${dataPath}.${error.params.missingProperty}` : error.params.missingProperty
      return [currentPath, 'missing required property']
    }

    if (error.keyword === 'propertyNames') {
      return undefined // this will be covered by next error
    }

    if (error.keyword === 'enum') {
      return [dataPath, `${error.message}: ${error.params.allowedValues.join(', ')}`]
    }

    if (error.propertyName !== undefined) {
      return [`${dataPath}['${error.propertyName}']`, `invalid property name: ${error.message}`]
    }

    return [dataPath, error.message]
  }).filter(e => e !== undefined)
}

function validated(obj, schemaUri) {
  const uri = schemaUri.startsWith('http') ? schemaUri : `${BaseSchemaURI}/${schemaUri}`
  const validate = ajv.getSchema(uri)

  if (validate === undefined) {
    throw new Error(`No such schema found: ${uri}`)
  }

  const isValid = validate(obj)
  if (!isValid) {
    const errors = formatValidationErrors(validate.errors)
    const error = new Error(`JSON validation errors: ${errors.map(([k, v]) => `"${k}": ${v}`).join(', ')}`)
    error.errors = validate.errors
    throw error
  }
  return obj
}

function validateWith(schemaUri) {
  return obj => validated(obj, schemaUri)
}

function getSchemaObject(schemaUri) {
  return get(ajv._schemas, schemaUri, {}).schema
}

module.exports = {
  validated,
  validateWith,
  formatValidationErrors,
  getSchemaObject
}
