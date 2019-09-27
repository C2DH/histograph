class AuthService {
  constructor(state, angularAuth0, timeout, log, rootScope) {
    this.tag = 'histograph'

    this.state = state
    this.angularAuth0 = angularAuth0
    this.timeout = timeout
    this.log = log
    this.rootScope = rootScope
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
        this.state.go('explore.resources')
        this.timeout(() => this.rootScope.$broadcast('authenticated'))
        console.log('!!AA')
      } else if (err) {
        this.timeout(() => this.state.go('explore.resources'))
        this.log.error(err)
      }
    })
  }

  renewTokens() {
    this.angularAuth0.checkSession({}, (err, result) => {
      if (err) {
        this.log.error(err)
      } else {
        this.localLogin(result)
        this.timeout(() => this.rootScope.$broadcast('authenticated'))
        console.log('!!BB')
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
    this.angularAuth0.authorize()
  }
}

function service($state, angularAuth0, $timeout, $log, $rootScope) {
  return new AuthService($state, angularAuth0, $timeout, $log, $rootScope)
}

angular.module('histograph')
  .factory('AuthService', service)
