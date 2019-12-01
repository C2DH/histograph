import { withStyles } from '../styles'

const styles = {
  container: {
    display: 'flex'
  }
}

function controller($scope) {
  withStyles($scope, styles)

  $scope.title = '[placeholder]'
}

angular.module('histograph')
  .controller('MergeEntitiesCtrl', controller)
