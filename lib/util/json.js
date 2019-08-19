const Ajv = require('ajv')

const ajv = new Ajv({ allErrors: true, strictKeywords: true })

ajv.addSchema(require('../../schema/json/mutations/merge_resource.json'))
ajv.addSchema(require('../../schema/json/mutations/merge_entity.json'))

const BaseSchemaURI = 'http://c2dh.uni.lu/histograph'

function validated(obj, schemaUri) {
  const uri = schemaUri.startsWith('http') ? schemaUri : `${BaseSchemaURI}/${schemaUri}`
  const validate = ajv.getSchema(uri)

  if (validate === undefined) {
    throw new Error(`No such schema found: ${uri}`)
  }

  const isValid = validate(obj)
  if (!isValid) {
    const error = new Error(`JSON validation errors: ${ajv.errorsText(validate.errors)}`)
    error.errors = validate.errors
    throw error
  }
  return obj
}

function formatValidationErrors(errors) {
  return errors.map(error => {
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
    if (error.propertyName !== undefined) {
      return [`${dataPath}['${error.propertyName}']`, `invalid property name: ${error.message}`]
    }

    return [dataPath, error.message]
  }).filter(e => e !== undefined)
}

module.exports = {
  validated,
  formatValidationErrors
}
