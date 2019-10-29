const assert = require('assert')
const { isNil, get } = require('lodash')
const { validated } = require('../../util/json')

function validatedAction(action) {
  const { type, meta } = action
  const actionMetaUri = `change_actions/${type}.json`
  return validated(
    {
      ...action,
      meta: validated(meta, actionMetaUri)
    },
    'db/change_action.json'
  )
}

const ContextLocation = {
  Title: 'title',
  Caption: 'caption',
  Content: 'content'
}

function translateContextWithLocation(context, location, resource, separatorSize = 2) {
  if (isNil(location)) return context

  switch (location) {
    case ContextLocation.Title:
      return context
    case ContextLocation.Caption:
      return Object.keys(context).reduce((acc, languageCode) => {
        const offset = get(resource, `title.${languageCode}`, '').length + separatorSize
        acc[languageCode] = context[languageCode].map(pair => pair.map(v => v + offset))
        return acc
      }, {})
    case ContextLocation.Content:
      return Object.keys(context).reduce((acc, languageCode) => {
        const offset = get(resource, `title.${languageCode}`, '').length + separatorSize
          + get(resource, `caption.${languageCode}`, '').length + separatorSize
        acc[languageCode] = context[languageCode].map(pair => pair.map(v => v + offset))
        return acc
      }, {})
    default:
      return assert.fail(`Unknown context location tag: ${location}`)
  }
}

module.exports = {
  validatedAction,
  translateContextWithLocation
}
