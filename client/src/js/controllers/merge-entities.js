import { includes, without } from 'lodash'
import { withStyles, theme } from '../styles'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  },
  controlsContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    padding: [[theme.units(1), 0]],
    borderBottom: '1px solid #d8d8d8',
    boxShadow: '0px 6px 6px #33333333',
    zIndex: 1,
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
    justifySelf: 'center',
    alignSelf: 'center',
    overflowY: 'auto',
    height: '100%',
    width: '60%',
    minWidth: '300px',
    '& ul': {
      marginTop: theme.units(2)
    }
  },
  entity: {
    display: 'flex',
    flexDirection: 'row'
  },
  entityControls: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    '& button': {
      marginLeft: theme.units(1)
    },
  },
  entityDetails: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginLeft: theme.units(2),
    '& .badge': {
      minWidth: 'auto',
      borderRadius: theme.units(0.3),
      marginLeft: theme.units(1)
    },
    '& a': {
      color: 'inherit',
      '&:hover': {
        textDecoration: 'underline'
      }
    }
  },
  entityText: {
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
    '& .mentions': {
      fontSize: '10px',
      lineHeight: '12px',
      fontWeight: 500,
      color: theme.colours.text.light.secondary
    }
  },
  mergeTargetControls: {
    display: 'flex',
    flexDirection: 'row',
    alignSelf: 'start',
    lineHeight: '33px',
    '& p': {
      margin: 0,
      padding: 0,
      marginRight: theme.units(1),
    },
    '& a': {
      color: 'inherit',
      '&:hover': {
        textDecoration: 'underline'
      }
    },
    transition: 'opacity 1s',
    opacity: 0
  },
  controlsAnimation: {
    opacity: 1
  },
  loadMoreItemsSection: {
    display: 'flex',
    width: '100%',
    '& button': {
      width: '100%'
    },
    marginBottom: theme.units(2)
  }
}

function controller($scope, MatchingEntitiesService, ActionsService, $log, $location) {
  withStyles($scope, styles)

  $scope.query = $location.search().q || ''
  $scope.entities = []
  $scope.sourceEntities = []

  $scope.setQuery = () => {
    const { query: q } = $scope
    $location.search(Object.assign({}, $location.search(), { q }))
  }

  $scope.findEntities = () => {
    const { query } = $scope

    $scope.isLoading = true
    MatchingEntitiesService.find({ query }).$promise
      .then(results => {
        $scope.entities = []
        $scope.sourceEntities = []
        $scope.targetEntity = undefined

        $scope.entities = results
      })
      .finally(() => {
        $scope.isLoading = false
      })
  }

  $scope.$on('$locationChangeSuccess', () => $scope.findEntities())
  if ($scope.query) $scope.findEntities()

  $scope.loadMore = () => {
    const { query } = $scope
    const skip = $scope.entities.length

    $scope.isLoading = true
    MatchingEntitiesService.find({ query, skip }).$promise
      .then(results => {
        $scope.entities = $scope.entities.concat(results)
      })
      .finally(() => {
        $scope.isLoading = false
      })
  }

  $scope.setTarget = entity => {
    if (includes($scope.sourceEntities, entity)) {
      $scope.sourceEntities = without($scope.sourceEntities, entity)
    }
    $scope.targetEntity = entity
  }
  $scope.isSourceEntity = entity => includes($scope.sourceEntities, entity)
  $scope.toggleSourceEntity = entity => {
    if (includes($scope.sourceEntities, entity)) {
      $scope.sourceEntities = without($scope.sourceEntities, entity)
    } else {
      if ($scope.targetEntity === entity) {
        $scope.targetEntity = undefined
      }
      $scope.sourceEntities.push(entity)
    }
  }

  $scope.performMerge = () => {
    $scope.isLoading = true

    const sourceIds = $scope.sourceEntities.map(({ uuid }) => uuid)
    const { uuid: targetId } = $scope.targetEntity

    ActionsService.mergeEntities(sourceIds, targetId)
      .then(result => {
        const msg = result.performed
          ? 'Entities have been merged'
          : 'Merge is waiting for votes';
        $log.info(msg)

        $scope.query = ''
        $scope.entities = []
        $scope.sourceEntities = []
      }).finally(() => {
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
