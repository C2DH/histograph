const explorer = require('./explorer')

module.exports = router => {
  router.use('/explorer', explorer)
  return router
}
