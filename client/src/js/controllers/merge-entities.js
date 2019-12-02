import { withStyles, theme } from '../styles'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  },
  searchContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: [[theme.units(1), 0]],
    borderBottom: '1px solid #d8d8d8',
    boxShadow: '0px 6px 6px #33333333'
  },
  inputsWrapper: {
    display: 'flex',
    flexDirection: 'column',
  },
  inputsContainer: {
    display: 'flex',
    flexDirection: 'row'
  },
  searchInput: {
    width: theme.units(30),
    marginRight: theme.units(1),
  },
  searchBoxHelpText: {
    margin: 0,
    padding: 0,
    fontSize: '10px',
    lineHeight: '10px',
    paddingTop: '4px',
    color: theme.colours.text.light.secondary,
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
