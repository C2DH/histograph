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

module.exports = {
  validatedAction
}
