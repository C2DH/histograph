/* global window */

import { setUpStyles } from './styles'

setUpStyles()

const jquery = require('jquery')

window.jQuery = jquery
window.$ = jquery
window._ = require('lodash')
window.d3 = require('d3')
window.sigma = require('sigma')


require('sigma/build/plugins/sigma.layout.forceAtlas2.min')
require('sigma/build/plugins/sigma.plugins.dragNodes.min')
require('sigma/build/plugins/sigma.exporters.svg.min')

window.Masonry = require('masonry-layout')
window.moment = require('moment')
window.L = require('leaflet')
require('leaflet-iiif')

const angular = require('angular')
const io = require('socket.io-client')


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
require('angular-aria')
require('angular-animate')
require('angular-messages')
require('angular-material')

window.imagesLoaded = require('imagesloaded')
// https://github.com/klederson/angular-masonry-directive
require('./lib/angular-masonry.min')
require('angular-tour/dist/angular-tour')
require('angular-tour/dist/angular-tour-tpls')

window.auth0 = require('auth0-js')
require('angular-auth0')
require('angular-jwt')

window.io = io(window.__hg_settings.apiBaseUrl)

const app = require('./app.js')

app.provider('HgSettings', function settingsProvider() {
  this.getWhitelistedDomains = () => {
    const url = window.document.createElement('a')
    url.href = window.__hg_settings.apiBaseUrl
    return [url.host, url.hostname]
  }
  this.$get = () => window.__hg_settings
})

require('./constant.js')
require('./filters.js')
require('./services.js')

// require('./templates.js')


window.Annotator = require('./lib/annotator.min').Annotator
require('./lib/annotator.unsupported.min')

require('./directives/annotator.js')
require('./directives/annotorious.js')
require('./directives/sigma.js')
require('./directives/snippets.js')
require('./directives/timeline.js')
require('./directives/reporter.js')
require('./directives/popit.js')
require('./directives/lazy-text.js')
require('./directives/iiifImage.js')
require('./directives/on-enter.js')

require('./components/topic-details.js')
require('./components/snackbar.js')
require('./components/explorer.js')
require('./components/explorerFilter.js')
require('./components/textItemsFilter.js')
require('./components/resources-panel.js')
require('./components/slider-value-filter.js')
require('./components/auth.js')
require('./components/explorable-configuration.js')
require('./components/elements/date-filter.js')
require('./components/elements/grammar-filter.js')
require('./components/elements/related-to-filter.js')
require('./components/elements/veil.js')
require('./components/filters-menu.js')
require('./components/resource.js')
require('./components/entity.js')

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
require('./controllers/explorer.js')
require('./controllers/topicResources.js')
require('./controllers/loginCallback.js')
require('./controllers/changes-history.js')
require('./controllers/merge-entities.js')
require('./controllers/tag-documents.js')
require('./controllers/new-search.js')

// modal controllers. templates in templates/modal
require('./controllers/modals/contribute.js')
require('./controllers/modals/create-entity.js')
require('./controllers/modals/inspect.js')

function importTemplates() {
  const ctx = require.context('../templates', true, /.*\.html$/)

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

require('../css/bootstrap.min.css')
require('../css/font-awesome.min.css')
require('../css/perfect-scrollbar.min.css')
require('../css/annotator.css')
require('../css/annotorious.css')
require('../css/style.css')
require('leaflet/dist/leaflet.css')
require('../css/base.css')
require('angular-material/angular-material.css')

app.run(function ($log, AuthService) {
  if (process.env.NOAUTH !== '1') {
    if (AuthService.isAuthenticated()) {
      AuthService.renewTokens();
    } else {
      AuthService.handleAuthentication();
    }
  } else {
    $log.warn('Authentication disabled!')
  }
  $log.log('hg running...')
})

export default {}
