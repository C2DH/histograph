/* global window */
const jquery = require('jquery')

window.jQuery = jquery
window.$ = jquery

const angular = require('angular')
require('angular-ui-router')
require('angular-route')
require('angular-resource')
require('angular-sanitize')
require('angular-cookies')
require('angular-google-analytics')
require('angular-ui-bootstrap')
require('angular-translate')
require('angular-translate-loader-static-files')
require('perfect-scrollbar')
require('angular-perfect-scrollbar')
require('angular-local-storage')
// https://github.com/klederson/angular-masonry-directive
require('./lib/angular-masonry.min.js')
require('angular-tour/dist/angular-tour')
require('angular-tour/dist/angular-tour-tpls')

window.io = require('socket.io-client')
window._ = require('lodash')
window.d3 = require('d3')
window.sigma = require('sigma')
window.Masonry = require('masonry-layout')

require('./lib/components/topicModellingTimeline.js')

require('./app.js')
require('./constant.js')
require('./services.js')
require('./filters.js')
// require('./templates.js')

require('./controllers/core.js')
require('./controllers/filters.js')

require('./controllers/all-in-between.js')
require('./controllers/all-shortest-paths.js')
require('./controllers/collection.js')
require('./controllers/crowd.js')
require('./controllers/entity.js')
require('./controllers/graph.js')
require('./controllers/guided-tour.js')
require('./controllers/index.js')
require('./controllers/inquiry.js')
require('./controllers/issue.js')
require('./controllers/neighbors.js')
require('./controllers/projection.js')
require('./controllers/pulse.js')
require('./controllers/resource.js')
require('./controllers/search.js')
require('./controllers/user.js')
require('./controllers/topicModelling.js')

// modal controllers. templates in templates/modal
require('./controllers/modals/contribute.js')
require('./controllers/modals/create-entity.js')
require('./controllers/modals/inspect.js')


// require('./directives/annotator.js') 
require('./directives/annotorious.js')
require('./directives/sigma.js')  
require('./directives/snippets.js') 
require('./directives/timeline.js')
require('./directives/reporter.js')
require('./directives/popit.js')
require('./directives/lazy-text.js')
require('./directives/iiifImage.js')
require('./directives/topicModellingTimeline.js')

function importTemplates() {
  const ctx = require.context('../templates', true, /.*\.html$/);

  angular.module('histograph').run([
    '$templateCache',
    $templateCache => {
      ctx.keys().forEach(key => {
        $templateCache.put(key.replace(/^\./, 'templates'), ctx(key))
      })
    }
  ])
}

importTemplates()

const socket = window.io()
console.log('Socket set up', socket)

export default {}
