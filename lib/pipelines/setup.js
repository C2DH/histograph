const { setUpConstraintsAndIndexes } = require('../logic/setup')

async function execute() {
  await setUpConstraintsAndIndexes()
  return 'Done'
}

module.exports = { execute }
