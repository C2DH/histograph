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
    flexBasis: '50%',
    minWidth: '300px',
    '& ul': {
      marginTop: theme.units(2)
    },
    margin: [[0, theme.units(1)]]
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
    marginRight: theme.units(2)
  },
  entityDetails: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    '& .badge': {
      minWidth: 'auto',
      borderRadius: theme.units(0.3),
      marginLeft: theme.units(1)
    },
    '& p': {
      margin: 0
    },
    '& a': {
      color: 'inherit',
      '&:hover': {
        textDecoration: 'underline'
      }
    }
  },
  controlsAnimation: {
    opacity: 1
  },
  resourcesInfoContainer: {
    display: 'flex',
    flexDirection: 'column',
    flexBasis: '50%',
    margin: [[0, theme.units(1)]]
  },
  contentWrapper: {
    display: 'flex',
    flexDirection: 'row',
    overflowY: 'auto'
  },
  resourcesSummary: {
    display: 'flex',
    marginTop: theme.units(2),
    marginBottom: theme.units(1)
  },
  resourcesList: {
    display: 'flex',
    overflowY: 'auto',
    height: '100%',
    '& ul': {
      width: '100%'
    }
  }
}

function controller($scope, $location, SuggestFactory, MatchingEntitiesService) {
  withStyles($scope, styles)

  $scope.entitiesQuery = $location.search().e || ''
  $scope.resourcesQuery = $location.search().r || ''

  $scope.setEntitiesQuery = () => {
    const { entitiesQuery: e } = $scope
    $location.search(Object.assign({}, $location.search(), { e }))
  }

  $scope.setResourcesQuery = () => {
    const { resourcesQuery: r } = $scope
    $location.search(Object.assign({}, $location.search(), { r }))
  }

  $scope.findEntities = () => {
    const { entitiesQuery: query } = $scope
    if (!query) return

    $scope.isLoading = true
    MatchingEntitiesService.find({ query }).$promise
      .then(results => {
        $scope.entities = results
      })
      .finally(() => {
        $scope.isLoading = false
      })
  }

  $scope.loadMoreEntities = () => {
    const { entitiesQuery: query } = $scope
    if (!query) return

    const skip = $scope.entities.length

    $scope.isLoading = true
    MatchingEntitiesService.find({ query, skip }).$promise
      .then(results => {
        $scope.entities = results
      })
      .finally(() => {
        $scope.isLoading = false
      })
  }

  $scope.$watch(() => $location.search().e, $scope.findEntities)

  $scope.findResources = () => {
    const { resourcesQuery } = $scope
    if (!resourcesQuery) return

    const query = `"${resourcesQuery}"`

    $scope.isLoading = true
    SuggestFactory.getResources({ query }).$promise
      .then(response => {
        const { info: { total_items: matchedDocumentsCount }, result: { items } } = response
        $scope.matchedDocumentsCount = matchedDocumentsCount
        $scope.resources = items.map(({ props }) => props)
      })
      .finally(() => {
        $scope.isLoading = false
      })
  }

  $scope.$watch(() => $location.search().r, $scope.findResources)

  $scope.setTargetEntity = entity => { $scope.targetEntity = entity }

  $scope.tagDocuments = () => {
    console.log(`Will tag ${$scope.matchedDocumentsCount} items with entity ${$scope.targetEntity.name}`)
  }
}

angular.module('histograph')
  .controller('TagDocumentsCtrl', controller)
