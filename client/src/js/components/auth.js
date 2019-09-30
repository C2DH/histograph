class AuthService {
  constructor(state, angularAuth0, timeout, log, rootScope, location) {
    this.tag = 'histograph'

    this.state = state
    this.angularAuth0 = angularAuth0
    this.timeout = timeout
    this.log = log
    this.rootScope = rootScope
    this.location = location
  }

  localLogin(authResult) {
    window.localStorage.setItem(`${this.tag}.isLoggedIn`, 'true')
    window.localStorage.setItem(`${this.tag}.expiresAt`, (authResult.expiresIn * 1000) + new Date().getTime())
    window.localStorage.setItem(`${this.tag}.accessToken`, authResult.accessToken)
    window.localStorage.setItem(`${this.tag}.idToken`, authResult.idToken)
  }

  handleAuthentication() {
    this.angularAuth0.parseHash((err, authResult) => {
      if (authResult && authResult.accessToken && authResult.idToken) {
        this.localLogin(authResult)
        const url = window.localStorage.getItem(`${this.tag}.returnUrl`)
        window.localStorage.removeItem(`${this.tag}.returnUrl`)
        this.location.url(url || '/')
        this.timeout(() => this.rootScope.$broadcast('authenticated'))
      } else if (err) {
        this.timeout(() => this.location.url('/'))
        this.log.error(err)
      }
    })
  }

  renewTokens() {
    this.angularAuth0.checkSession({}, (err, result) => {
      if (err) {
        // this.log.error(err)
        this.login()
      } else {
        this.localLogin(result)
        this.timeout(() => this.rootScope.$broadcast('authenticated'))
      }
    })
  }


  logout() {
    window.localStorage.removeItem(`${this.tag}.isLoggedIn`)
    window.localStorage.removeItem(`${this.tag}.expiresAt`)
    window.localStorage.removeItem(`${this.tag}.accessToken`)
    window.localStorage.removeItem(`${this.tag}.idToken`)

    this.angularAuth0.logout({
      returnTo: window.location.origin
    })

    this.state.go('explore.resources')
  }

  isAuthenticated() {
    const expiresAt = window.localStorage.getItem(`${this.tag}.expiresAt`) || 0
    // Check whether the current time is past the
    // Access Token's expiry time
    return window.localStorage.getItem(`${this.tag}.isLoggedIn`) === 'true'
      && new Date().getTime() < expiresAt
  }

  getIdToken() {
    return window.localStorage.getItem(`${this.tag}.idToken`)
  }

  getAccessToken() {
    return window.localStorage.getItem(`${this.tag}.accessToken`)
  }

  login() {
    window.localStorage.setItem(`${this.tag}.returnUrl`, this.location.url())
    this.angularAuth0.authorize()
  }
}

function service($state, angularAuth0, $timeout, $log, $rootScope, $location) {
  return new AuthService($state, angularAuth0, $timeout, $log, $rootScope, $location)
}

function currentUserProvider() {
  this.$get = function (UserFactory, $rootScope, $q) {
    const getUserPromise = () => UserFactory.get({ method: 'session' })
      .$promise
      .then(result => result.result.item)

    return getUserPromise()
      .catch(err => {
        if (err.status !== 403 && err.status !== 401) throw err
        const d = $q.defer()

        let unsubscribe
        const onAuthenticated = () => {
          d.resolve()
          unsubscribe()
        }
        unsubscribe = $rootScope.$on('authenticated', onAuthenticated)

        return d.promise.then(getUserPromise)
      })
  }
}

angular.module('histograph')
  .factory('AuthService', service)
  .provider('currentUserPromise', currentUserProvider)
