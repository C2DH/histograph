import { withStyles, theme } from '../styles'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  },
  searchContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    padding: [[theme.units(1), 0]],
    borderBottom: '1px solid #d8d8d8',
    boxShadow: '0px 6px 6px #33333333'
  },
  searchInput: {
    width: theme.units(30),
    marginRight: theme.units(1),
  },
  entitiesContainer: {
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    height: '100%'
  },
  entitiesContent: {}
}

function controller($scope, MatchingEntitiesService) {
  withStyles($scope, styles)

  $scope.query = ''
  $scope.entities = []

  $scope.findEntities = () => {
    const { query } = $scope

    $scope.isLoading = true
    $scope.entities = []
    MatchingEntitiesService.find({ query }).$promise
      .then(results => {
        $scope.entities = results
      })
      .finally(() => {
        $scope.isLoading = false
      })
  }
}

function service($resource, HgSettings) {
  const url = `${HgSettings.apiBaseUrl}/api/suggest/entities/matching`
  return $resource(url, null, {
    find: { method: 'GET', isArray: true }
  })
}

angular.module('histograph')
  .controller('MergeEntitiesCtrl', controller)
  .factory('MatchingEntitiesService', service)
