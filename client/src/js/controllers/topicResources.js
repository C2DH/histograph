import { assignIn } from 'lodash'
import { withStyles, theme } from '../styles'
import {
  bindStateChangeToObject,
  serializeStringList,
  deserializeStringList
} from '../utils'

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  },
  container: {
    display: 'flex',
    flexDirection: 'row',
    alignContent: 'stretch',
    alignItems: 'stretch',
    width: '100% !important',
    position: 'initial',
    height: '100%'
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

function controller($scope, $stateParams, $location, ResourceFactory) {
  withStyles($scope, styles)

  // NOTE: a workaround to disable ruler (see filters.js). Ugly but saves from refactoring.
  $scope.rulerDisabled = true

  $scope.uid = $scope.$id
  $scope.busyCounter = 0
  $scope.params = {}

  const { id: topicId } = $stateParams
  $scope.topicId = topicId

  $scope.setAvailableSortings(SortingMethods)

  bindStateChangeToObject($scope, $location, 'params', [
    'from',
    'to',
    ['with', 'with', undefined, serializeStringList, deserializeStringList],
    ['keywords', 'keywords', undefined, serializeStringList, deserializeStringList],
    ['tst', 'topicModellingScoresLowerThreshold', 0.0, v => v.toPrecision(2), parseFloat],
    ['orderby', 'orderby', 'topic-modelling-score'],
  ])

  $scope.$watch('params', () => {
    $scope.searchParams = assignIn({}, $scope.params, {
      topicModellingIndex: topicId,
    })
  }, true)

  $scope.$watch('searchParams', $scope.syncTimeline, true)

  $scope.loadResources = params => {
    const p = {
      language: $scope.language,
      ...params
    }
    return ResourceFactory.get(p).$promise
  }
}

angular.module('histograph').controller('TopicResourcesCtrl', controller)
