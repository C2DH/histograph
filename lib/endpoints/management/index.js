const resources = require('./resources')
const users = require('./users')
const pipelines = require('./pipelines')
const topics = require('./topics')

module.exports = router => {
  router.use('/resources', resources)
  router.use('/users', users)
  router.use('/pipelines', pipelines)
  router.use('/topics', topics)
  return router
}
