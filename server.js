const express = require('express')
const compress = require('compression')
const bodyParser = require('body-parser')
const _ = require('lodash')
const socketIo = require('socket.io')
const fs = require('fs')
const path = require('path')
const morgan = require('morgan')
const requireAll = require('require-all')

const auth = require('./auth')
const settings = require('./settings')
const { getLogger } = require('./lib/util/log')

const log = getLogger()

const app = express()
const port = process.env.PORT || settings.port || 8000
const env = settings.env || process.env.NODE_ENV || 'development'
const server = app.listen(port)
const io = socketIo.listen(server)

const ctrl = requireAll({
  dirname: `${__dirname}/controllers`,
  filter: /(.*).js$/,
  resolve(f) {
    return f(io)
  }
})

const clientRouter = express.Router()
const apiRouter = express.Router()
apiRouter.use(auth.checkJwt)
apiRouter.use(auth.getUserProfile)

log.info('title:', settings.title)
log.info('logs: ', settings.paths.accesslog)
log.info('env:  ', env)
log.info('port: ', settings.port)
log.info('media:', settings.paths.media)

app.use(compress())
app.use(morgan('combined', {
  stream: fs.createWriteStream(settings.paths.accesslog, { flags: 'a' })
}))

app.use(express.static('./client/dist'))

if (env !== 'production') {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.get('origin'))
    res.header('Access-Control-Allow-Methods', 'OPTIONS, POST, PUT, DELETE, GET')
    res.header('Access-Control-Allow-Headers',
      'X-Requested-With, Content-Type, Cookie, Set-Cookie, Authorization')
    res.header('Access-Control-Allow-Credentials', 'true')
    next()
  })
}

app.options('/*', (req, res) => {
  res.ok()
})

// configure app to use bodyParser(), this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }))
app.use(bodyParser.json({ limit: '10mb' }))

// enrich express responses
express.response.ok = function responseOk(result, info, warnings) {
  const res = {
    status: 'ok',
    result
  }

  if (info) { res.info = info }

  if (warnings) { res.warnings = warnings }

  return this.json(res)
}

express.response.empty = function responseEmpty() {
  // Since The 204 response MUST NOT include a message-body,
  // we use a dummy 200 with status = empty...
  return this.status(200).json({
    status: 'empty'
  })
}

express.response.error = function responseError(statusCode, err) {
  return this.status(statusCode).json({
    status: 'error',
    error: _.assign({
      code: statusCode,
    }, err)
  })
}

clientRouter.route('/media/:path/:file')
  .get((req, res) => {
    const filename = path.join(settings.paths.media, req.params.path, req.params.file)

    res.sendFile(filename, (err) => {
      if (err) {
        res.status(err.status).end()
      }
    })
  })

clientRouter.route('/media/:file')
  .get((req, res) => {
    const filename = path.join(settings.paths.media, req.params.file)

    res.sendFile(filename, { root: path.isAbsolute(settings.paths.media) ? '' : __dirname }, (err) => {
      if (err) {
        res.status(err.status).end()
      }
    })
  })
/*
  serving Tiles for the specified path
  Note that settings.path.media should have a tile folder
  tiles/{file}/{z}/{y}/{x}.jpg"

*/
clientRouter.route('/tiles/:file/:z(\\d+)/:y(\\d+)/:x(\\d+.jpg)')
  .get((req, res) => {
    const filename = path.join(settings.paths.media, 'tiles', req.params.file, req.params.z, req.params.y, req.params.x)
    log.info('requesting:', filename)
    res.sendFile(filename, { root: path.isAbsolute(settings.paths.media) ? '' : __dirname }, (err) => {
      if (err) {
        res.status(err.status).end()
      }
    })
  })

clientRouter.route('/txt/:file')
  .get((req, res) => {
    const filename = path.join(settings.paths.txt, req.params.file)
    res.sendFile(filename, { root: __dirname }, (err) => {
      if (err) {
        res.status(err.status).end()
      }
    })
  })

clientRouter.route('/txt/:path/:file')
  .get((req, res) => {
    const filename = path.join(settings.paths.txt, req.params.path, req.params.file)
    res.sendFile(filename, { root: __dirname }, (err) => {
      if (err) {
        res.status(err.status).end()
      }
    })
  })

/* 404 handler for files */
clientRouter.route(/\/.+/)
  .get((req, res, next) => {
    res.sendFile(path.join(__dirname, './client/dist/index.html'), next)
  })

// api index
apiRouter.route('/')
  .get((req, res) => { // test route to make sure everything is working (accessed at GET http://localhost:8080/api)
    res.ok({ message: 'hooray! welcome to our api!' })
  })

apiRouter.route('/another')
  .get((req, res) => { // test route to make sure everything is working (accessed at GET http://localhost:8080/api)
    res.ok({ message: 'hooray! another!' })
  })

apiRouter.route('/settings/optional-features')
  .get((req, res) => res.json(settings.optionalFeatures))

// face recognition tests
apiRouter.route('/alchemyapi/image-face-tags')
  .post(ctrl.alchemyapi.imageFaceTags.url)

apiRouter.route('/rekognition/face-detect')
  .post(ctrl.rekognition.faceDetect)

apiRouter.route('/rekognition/face-search')
  .post(ctrl.rekognition.faceSearch)

apiRouter.route('/skybiometry/face-detect')
  .post(ctrl.skybiometry.faceDetect)


let dataApiRouter = express.Router()
dataApiRouter.use(auth.apiKeyAuthMiddleware)
dataApiRouter = require('./lib/endpoints/management')(dataApiRouter)

/*

  Registering routes ...
  ======================

*/
app.use('/api/v1', dataApiRouter)
app.use('/api', apiRouter) // api endpoint. we should be auth to pass this point.
app.use('/', clientRouter) // client router

function getErrorStatusCode(err) {
  const { code, statusCode, status } = err
  if (statusCode) return statusCode
  if (status) return status
  if (code === 'ERR_ASSERTION') return 400
  return 500
}

app.use((err, req, res, next) => {
  const statusCode = getErrorStatusCode(err)

  if (statusCode >= 500) log.info(err.stack)

  const responseBody = {
    message: err.message
  }
  if (process.env.NODE_ENV !== 'production') {
    responseBody.stack = err.stack
  }
  res.status(statusCode).json(responseBody)
  next()
})

/*

  Controller: user
  ----------------

  Cfr. controllers/user.js
  Cfr Neo4j queries: [@todo]

*/
apiRouter.route('/user/session')// api session info
  .get(ctrl.user.session)
apiRouter.route('/user/pulsations') // return just the number
  .get(ctrl.user.pulsations)
apiRouter.route('/user/pulse') // return just the number
  .get(ctrl.user.pulse)
apiRouter.route('/user/noise') // return just the number
  .get(ctrl.user.noise)
apiRouter.route('/user/task/:what(unknownpeople|resourcelackingdate)') // return the task to be performed number
  .get(ctrl.user.task)


apiRouter.route('/user/:id([\\da-zA-Z_\\-]+)/related/resource') // api session info
  .get(ctrl.user.getRelatedResources)
apiRouter.route('/user/:id([\\da-zA-Z_\\-]+)/related/resource/graph') // api session info
  .get(ctrl.user.getRelatedResourcesGraph)

apiRouter.route('/user/apikey').put(ctrl.user.updateApiKey)


/*

  Controller: inquiry
  -------------------

  Cfr. controllers/inquiry.js
  Cfr Neo4j queries: queries/inquiry.cyp

*/
apiRouter.route('/inquiry')
  .get(ctrl.inquiry.getItems)
apiRouter.route('/inquiry/:id([\\da-zA-Z_\\-]+)')
  .get(ctrl.inquiry.getItem)
apiRouter.route('/inquiry/:id([\\da-zA-Z_\\-]+)/related/comment') // POST
  .post(ctrl.inquiry.createComment)
  .get(ctrl.inquiry.getRelatedComment)


/*

  Controller: issue
  -------------------

  Cfr. controllers/issue.js
  Cfr Neo4j queries: queries/issue.cyp

*/
apiRouter.route('/issue')
  .get(ctrl.issue.getItems)
apiRouter.route('/issue/:id([\\da-zA-Z_\\-]+)')
  .get(ctrl.issue.getItem)
// RK: Does not look like the endpoints below are being used
apiRouter.route('/issue/:id([\\da-zA-Z_\\-]+)/upvote')
  .post(ctrl.issue.upvote)
apiRouter.route('/issue/:id([\\da-zA-Z_\\-]+)/downvote')
  .post(ctrl.issue.downvote)


/*

  Controller: inquiry
  -------------------

  Cfr. controllers/inquiry.js
  Cfr Neo4j queries: queries/inquiry.cyp

*/
apiRouter.route('/comment/:id([\\da-zA-Z_\\-]+)/upvote')
  .post(ctrl.comment.upvote)
apiRouter.route('/comment/:id([\\da-zA-Z_\\-]+)/downvote')
  .post(ctrl.comment.downvote)

/*

  Controller: resource
  ----------------------

  Cfr. controllers/resource.js
  Cfr Neo4j queries: queries/resource.cyp

*/
apiRouter.route('/resource')
  .get(ctrl.resource.getItems)
apiRouter.route('/resource/timeline')
  .get(ctrl.resource.getTimeline)

apiRouter.route('/resource/topics/:set/:index')
  .get(ctrl.resource.getTopicDetails)
  .put(ctrl.resource.updateTopicDetails)

apiRouter.route('/resource/:id([\\d,a-zA-Z\\-_]+)')
  .get(ctrl.resource.getItem)
apiRouter.route('/resource/:id([\\da-zA-Z_\\-]+)/related/resource')
  .get(ctrl.resource.getRelatedItems)
apiRouter.route('/resource/:id([\\da-zA-Z_\\-]+)/related/comment') // POST
  .post(ctrl.resource.createComment)
apiRouter.route('/resource/:id([\\da-zA-Z_\\-]+)/related/inquiry')
  .post(ctrl.resource.createInquiry)
  .get(ctrl.resource.getRelatedInquiry)
apiRouter.route('/resource/:id([\\da-zA-Z_\\-]+)/related/:entity(person|location|organization)')
  .get(ctrl.resource.getRelatedEntities)
  .post(ctrl.resource.createRelatedEntity)
apiRouter.route('/resource/:id([\\da-zA-Z_\\-]+)/related/:action(annotate)')
  .get(ctrl.resource.getRelatedActions)
apiRouter.route('/resource/:id([\\da-zA-Z_\\-]+)/related/user')
  .get(ctrl.resource.getRelatedUsers)
  .post(ctrl.resource.createRelatedUser)
  .delete(ctrl.resource.removeRelatedUser)
apiRouter.route('/resource/:id([\\da-zA-Z_\\-]+)/related/issue')
  .post(ctrl.resource.createIssue)
  .get(ctrl.resource.getRelatedIssue)
apiRouter.route('/resource/:id([\\da-zA-Z_\\-]+)/related/:entity(person|location|organization)/graph')
  .get(ctrl.resource.getRelatedEntitiesGraph)
apiRouter.route('/resource/:id([\\da-zA-Z_\\-]+)/related/resource/graph')
  .get(ctrl.resource.getRelatedResourcesGraph)
apiRouter.route('/resource/:id([\\da-zA-Z_\\-]+)/related/resource/timeline')
  .get(ctrl.resource.getRelatedResourcesTimeline)

apiRouter.route('/cooccurrences/:entityA(person|theme|location|place|organization)/related/:entityB(person|theme|location|place|organization)') // @todo move to entity controller.
  .get(ctrl.resource.getCooccurrences)
// apiRouter.route('/resource/related/:entity(person|location|organization|theme)/graph')

/*

  Controller: entity
  ----------------------

  Cfr. controllers/entity.js
  Cfr Neo4j queries: queries/entity.cyp

*/
apiRouter.route('/entity/:id([\\d,a-zA-Z\\-_]+)')
  .get(ctrl.entity.getItem)

apiRouter.route('/entity/:id([\\da-zA-Z_\\-]+)/related/resource')
  .get(ctrl.entity.getRelatedResources)

apiRouter.route('/entity/:id([\\da-zA-Z_\\-]+)/related/:entity(person|location|theme|organization)')
  .get(ctrl.entity.getRelatedEntities)

apiRouter.route('/entity/:id([\\da-zA-Z_\\-]+)/related/issue')
  .post(ctrl.entity.createRelatedIssue) // that is, I AGREE
  .delete(ctrl.entity.removeRelatedIssue) // that is, I DISAGREE

apiRouter.route('/entity/:id/related/:entity(person|location|theme|organization)/graph')
  .get(ctrl.entity.getRelatedEntitiesGraph)

apiRouter.route('/entity/:id([\\da-zA-Z_\\-]+)/related/resource/graph')
  .get(ctrl.entity.getRelatedResourcesGraph)

apiRouter.route('/entity/:id([\\da-zA-Z_\\-]+)/related/resource/timeline')
  .get(ctrl.entity.getRelatedResourcesTimeline)

apiRouter.route('/entity/:id([\\da-zA-Z_\\-]+)/upvote')
  .post(ctrl.entity.upvote)

apiRouter.route('/entity/:id([\\da-zA-Z_\\-]+)/downvote')
  .post(ctrl.entity.downvote)

apiRouter.route('/entity/:entity_id([\\da-zA-Z_\\-]+)/related/resource/:resource_id([\\da-zA-Z_\\-]+)')
  .post(ctrl.entity.createRelatedResource) // create or merge the relationship.
  // The authentified user will become a curator
  .delete(ctrl.entity.removeRelatedResource) // delete the relationship whether possible

apiRouter.route('/entity/:entity_id([\\da-zA-Z_\\-]+)/related/resource/:resource_id([\\da-zA-Z_\\-]+)/:action(upvote|downvote|merge)')
  .post(ctrl.entity.updateRelatedResource)


/*

  Controller: collection
  ----------------------

  Cfr. controllers/collection.js
  Cfr Neo4j queries: queries/collection.cyp

*/
// apiRouter.route('/collection')
//   .get(ctrl.collection.getItems)
//   .post(ctrl.collection.create);
// apiRouter.route('/collection/:id')
//   .get(ctrl.collection.getItem);
// apiRouter.route('/collection/:id/graph')
//   .get(ctrl.collection.getGraph);
// // apiRouter.route('/collection/:id/related/item') // generic items related to a collection
//   // .get(ctrl.collection.getRelatedItems)
//   // .post(ctrl.collection.addRelatedItems);
// apiRouter.route('/collection/:id/related/resources')
//   .get(ctrl.collection.getRelatedResources);


/*

  Controller: search & suggest
  ----------------------

  This controller answers every typeahead request.

  Cfr. controllers/suggest.js
  Cfr Neo4j queries: queries/collection.cyp

*/
apiRouter.route('/suggest')
  .get(ctrl.suggest.suggest)

apiRouter.route('/suggest/stats')
  .get(ctrl.suggest.getStats)
apiRouter.route('/suggest/resource')
  .get(ctrl.suggest.getResources)
apiRouter.route('/suggest/:entity(entity|person|location|organization|theme)')
  .get(ctrl.suggest.getEntities)
apiRouter.route('/suggest/resource/graph')
  .get(ctrl.suggest.getResourcesGraph)
apiRouter.route('/suggest/:entity(person|location|organization|theme)/graph')
  .get(ctrl.suggest.getEntitiesGraph)

apiRouter.route('/suggest/all-in-between/:ids([\\da-zA-Z_\\-][\\d,a-zA-Z\\-_]+)/resource/graph')
  .get(ctrl.suggest.getAllInBetweenGraph)
apiRouter.route('/suggest/all-in-between/:ids([\\da-zA-Z_\\-][\\d,a-zA-Z\\-_]+)/resource')
  .get(ctrl.suggest.getAllInBetweenResources)
apiRouter.route('/suggest/all-in-between/:ids([\\da-zA-Z_\\-][\\d,a-zA-Z\\-_]+)/resource/timeline')
  .get(ctrl.suggest.getAllInBetweenTimeline)

apiRouter.route('/suggest/all-shortest-paths/:ids([\\d,a-zA-Z\\-_]+)')
  .get(ctrl.suggest.allShortestPaths)
apiRouter.route('/suggest/all-in-between')
  .get(ctrl.suggest.allInBetween)
apiRouter.route('/suggest/unknown-node/:id([\\da-zA-Z_\\-]+)')
  .get(ctrl.suggest.getUnknownNode)
apiRouter.route('/suggest/unknown-nodes/:ids([\\d,a-zA-Z\\-_]+)')
  .get(ctrl.suggest.getUnknownNodes)
apiRouter.route('/suggest/neighbors/:ids([\\d,a-zA-Z\\-_]+)')
  .get(ctrl.suggest.getNeighbors)
apiRouter.route('/suggest/shared/:ids([\\d,a-zA-Z\\-_]+)/resource')
  .get(ctrl.suggest.getSharedResources)
apiRouter.route('/suggest/shared/:ids([\\d,a-zA-Z\\-_]+)/:entity(person|location|organization)')
  .get(ctrl.suggest.getSharedEntities)

// api proxy for VIAF (they don't have CROSS ORIGIN ...)
apiRouter.route('/suggest/viaf')
  .get(ctrl.suggest.viaf.autosuggest)
apiRouter.route('/suggest/dbpedia')
  .get(ctrl.suggest.dbpedia)

const explorerRoutes = require('./lib/endpoints/public/explorer')

apiRouter.use('/explorer/', explorerRoutes)

apiRouter.route(/\/.+/)
  .get((req, res, next) => {
    res.status(404).send()
  })

/*

  Socket io config
  ------

  listen to connections with socket.io.
  Cfr. controllers/*.js to find how io has been implemented.

*/

io.use((socket, next) => auth.checkJwt(socket.request, socket.request.res, next))
io.use((socket, next) => auth.getUserProfile(socket.request, socket.request.res, next))

process.on('SIGINT', () => {
  log.info('Interrupted. Exiting...')
  process.exit()
})
