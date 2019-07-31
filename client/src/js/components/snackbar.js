import { isString } from 'lodash'
import { withStyles, theme } from '../styles'

const styles = {
  snackbar: {
    width: 300,
    height: 'auto',
    position: 'fixed',
    zIndex: 100,
    bottom: 10,
    left: 30,
    color: 'white',
    fontWeight: 'bold',
    '& .error': {
      background: theme.colours.action.error
    },
    '& .warn': {
      background: theme.colours.action.warn
    },
    '& .info': {
      background: theme.colours.action.info
    },
  },
  message: {
    borderRadius: '.3em',
    padding: [['.2em', '.8em']],
  }
}

function controller($scope, $timeout) {
  withStyles($scope, styles)

  function showMessage(type, ...args) {
    const message = args.map(v => (isString(v) ? v : JSON.stringify(v))).join(' ')

    // TODO: update third party components to stop complaining to $log.warn
    if (/is now deprecated/.test(message) && type === 'warn') return

    $scope.message = message
    $scope.messageType = type
    $timeout(() => { $scope.message = undefined }, 3000)
  }

  $scope.$on('log:info', (e, ...args) => showMessage('info', ...args))
  $scope.$on('log:warn', (e, ...args) => showMessage('warn', ...args))
  $scope.$on('log:error', (e, ...args) => showMessage('error', ...args))
}

const directive = {
  restrict: 'A',
  template: `
    <div ng-show="message" class="{{classes.snackbar}}">
      <div class="{{classes.message}} {{messageType}}">
        {{message}}
      </div>
    </div>
  `,
  controller: 'SnackbarCtrl'
}

angular.module('histograph')
  .directive('hiSnackbar', () => directive)
  .controller('SnackbarCtrl', controller)
