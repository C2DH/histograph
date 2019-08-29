import { withStyles, theme } from '../styles'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    alignContent: 'stretch',
    alignItems: 'stretch',
    width: '100% !important',
    position: 'absolute',
    bottom: 0,
    top: 40,
  },
  containerChild: {
    flex: 1,
  },
  topicDetails: {
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: theme.colours.background.dark.primary,
    color: theme.colours.text.light.primary
  },
  mainPanel: {
    flex: '1 1 100%',
    flexGrow: 3,
    overflowY: 'scroll',
    margin: '1em 1em 0 1em',
  },
  resourceItems: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  resourceItem: {
    flex: '0 0 30%',
    margin: '10px'
  },
  moreButton: {
    width: '100%'
  }
}
function controller($scope, $stateParams, $log, $location, ResourceFactory) {
  withStyles($scope, styles)

  const { id: topicId } = $stateParams
  $scope.topicId = topicId

  const topicScoreLowerThreshold = 0.0

  $scope.resources = []

  $scope.loadMoreResources = () => {
    const { from, to } = $location.search()

    $scope.busyCounter += 1
    ResourceFactory.get({
      limit: $scope.resourcesPageLimit,
      offset: $scope.resources.length,
      topicModellingScoresLowerThreshold: topicScoreLowerThreshold,
      topicModellingIndex: topicId,
      from,
      to
    }).$promise
      .then(results => {
        $scope.resources = $scope.resources.concat(results.result.items)
        $scope.totalItems = results.info.total_items
      })
      .catch(e => {
        $log.error('Could not get resources from the API', e.message)
      })
      .finally(() => {
        $scope.busyCounter -= 1
      })
  }

  $scope.$on('$locationChangeSuccess', () => {
    $scope.resources = []
    $scope.totalItems = 0
    $scope.loadMoreResources()
  })
  $scope.loadMoreResources()
}

angular.module('histograph').controller('TopicResourcesCtrl', controller)
