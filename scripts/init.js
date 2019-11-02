const { execute } = require('../lib/pipelines/setup')
const { getLogger } = require('../lib/util/log')

const log = getLogger()

if (require.main === module) {
  execute()
    .then(() => {
      log.info('Setup done')
      process.exit(0)
    })
    .catch(e => {
      log.error(e.stack)
      process.exit(1)
    })
}
