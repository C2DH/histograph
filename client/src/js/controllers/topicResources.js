import { assignIn } from 'lodash'
import { withStyles, theme } from '../styles'
import {
  bindStateChangeToObject,
  serializeStringList,
  deserializeStringList
} from '../utils'

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

const SortingMethods = [
  { label: 'topic modelling score (higher score first)', value: 'topic-modelling-score' },
  { label: 'date (newest first)', value: '-date' },
  { label: 'date (oldest first)', value: 'date' },
]

function controller($scope, $stateParams, $log, $location, ResourceFactory, ResourceVizFactory) {
  withStyles($scope, styles)

  $scope.uid = $scope.$id
  $scope.busyCounter = 0
  $scope.params = {}
  const topicScoreLowerThreshold = 0.0

  const { id: topicId } = $stateParams
  $scope.topicId = topicId

  $scope.setAvailableSortings(SortingMethods)

  bindStateChangeToObject($scope, $location, 'params', [
    'from',
    'to',
    ['with', 'with', undefined, serializeStringList, deserializeStringList],
    ['keywords', 'keywords', undefined, serializeStringList, deserializeStringList],
    ['orderby', 'orderby', 'topic-modelling-score'],
  ])

  const getSearchParams = () => assignIn({}, $scope.params, {
    topicModellingScoresLowerThreshold: topicScoreLowerThreshold,
    topicModellingIndex: topicId,
  })

  $scope.resources = []

  $scope.loadMoreResources = () => {
    if ($scope.busyCounter !== 0) return

    const params = assignIn(getSearchParams(), {
      limit: $scope.resourcesPageLimit,
      offset: $scope.resources.length,
    })

    $scope.busyCounter += 1
    ResourceFactory.get(params).$promise
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

  /*
    load the timeline of filtered resources
  */
  $scope.syncTimeline = () => ResourceVizFactory
    .get(angular.extend({ viz: 'timeline' }, getSearchParams())).$promise
    .then(res => $scope.setTimeline(res.result.timeline))
    .catch(e => $log.error(`Could not load timeline: ${e.message}`))

  $scope.$watch('params', () => {
    $scope.resources = []
    $scope.totalItems = 0
    $scope.loadMoreResources()
    $scope.syncTimeline()
  }, true)
}

angular.module('histograph').controller('TopicResourcesCtrl', controller)
