import {
  get, cloneDeep, assignIn, noop,
  includes, without, uniq, concat
} from 'lodash'
import { withStyles, theme } from '../styles'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignContent: 'stretch',
    fontFamily: '"proxima-nova",sans-serif',
    height: '100%',
    width: '100%',
  },
  panelTop: {
    display: 'flex',
    flexDirection: 'row',
    alignContent: 'stretch',
    justifyContent: 'space-between',
    padding: [['0.9em', '1.2em']],
    flexShrink: 0
  },
  label: {
    extend: theme.text.h3,
    display: 'flex',
    justifyContent: 'left',
    flexDirection: 'row',
    textAlign: 'left',
    flex: 1,
    cursor: 'text',
    borderBottom: `1px solid ${theme.colours.text.light.secondary}`,
    '& .fa': {
      marginRight: '.5em'
    }
  },
  closeButton: {
    background: 'none',
    border: 'none',
    display: 'inline-flex',
    padding: '0.3em',
    outline: 'none',
    '& .fa': {
      fontSize: '1.5em',
      display: 'inherit',
    }
  },
  editButton: {
    background: 'none',
    border: 'none',
    outline: 'none',
    padding: '0.2em .7em',
  },
  keywordsLabel: {
    margin: [['0em', '1.2em']],
    textTransform: 'uppercase',
    flexShrink: 0
  },
  keywordCloud: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: [['0.9em', '1.2em']],
    overflowY: 'scroll',
    '& span': {
      marginRight: '.3em',
      marginBottom: '.3em',
      color: theme.colours.text.light.secondary,
      background: '#22222277',
      padding: '0em .6em',
      borderRadius: '1em',
    }
  },
  labelEditPanel: {
    display: 'flex',
    alignContent: 'stretch',
    alignItems: 'center',
    borderBottom: `1px solid ${theme.colours.text.light.secondary}`,
    justifyContent: 'flex-start',
    flexGrow: 1,
    '& input': {
      border: 'none',
      outline: 'none',
      background: '#ffffff22',
      padding: '.2em .8em 0em',
      marginBottom: '.2em',
    },
  },
  buttonsPanel: {
    display: 'flex',
    alignContent: 'stretch',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    flexShrink: 0,
  },
  showResourcesButton: {
    background: 'none',
    display: 'inline-flex',
    padding: [['0.3em', '0.9em']],
    outline: 'none',
    borderWidth: '1px',
    borderStyle: 'solid',
    '& .fa': {
      marginRight: '0.5em'
    }
  },
  selectedKeyword: {
    color: '#222222 !important',
    background: `${theme.colours.text.light.secondary} !important`,
  },
  keywordSelectable: {
    cursor: 'pointer'
  }
}

function controller($scope, $log, $location, TopicsService) {
  withStyles($scope, styles)

  $scope.$watch('topicId', index => {
    if (index === undefined) return
    $scope.topic = undefined
    TopicsService.get({ index, set: 'default' }).$promise
      .then(topic => { $scope.topic = topic })
      .catch(e => {
        if (e.status === 404) {
          $scope.topic = {
            index,
            label: `Topic ${index}`,
            keywords: []
          }
        } else {
          $log.error('Could not get topic', e.status, e.message)
        }
      })
  })

  $scope.startEditLabel = () => {
    $scope.newTopicLabel = get($scope.topic, 'label', '')
    $scope.editingLabel = true
  }
  $scope.confirmEditLabel = () => {
    $scope.editingLabel = false
    if ($scope.newTopicLabel !== $scope.topic.label) {
      $log.log(`New Label: ${$scope.newTopicLabel}`)

      const { index } = $scope.topic
      const topic = assignIn(cloneDeep($scope.topic), { label: $scope.newTopicLabel })
      const originalTopic = $scope.topic
      $scope.topic = topic

      TopicsService.update({ index, set: 'default' }, topic).$promise
        .then(updatedTopic => {
          $scope.topic = updatedTopic
          $scope.onTopicUpdated()
        })
        .catch(e => {
          $log.error('Could not update topic', e.status, e.message)
          $scope.topic = originalTopic
        })
    }
  }
  $scope.cancelEditLabel = () => { $scope.editingLabel = false }

  $scope.showResources = () => {
    $location.path(`/topics/${$scope.topicId}/resources`).search('topicId', undefined)
  }

  $scope.isKeywordSelected = keyword => includes($scope.selectedKeywords, keyword)

  $scope.selectKeyword = keyword => {
    if (!$scope.keywordSelectionEnabled) return
    if ($scope.isKeywordSelected(keyword)) {
      $scope.selectedKeywords = without($scope.selectedKeywords, keyword)
    } else {
      $scope.selectedKeywords = uniq(concat($scope.selectedKeywords, keyword))
    }
  }
}

function service($resource, HgSettings) {
  const url = `${HgSettings.apiBaseUrl}/api/resource/topics/:set/:index`
  return $resource(url, null, {
    update: { method: 'PUT' }
  })
}

const directive = {
  restrict: 'A',
  scope: {
    topicId: '=hiTopicDetails',
    onCloseClicked: '&onClose',
    onTopicUpdated: '&onTopicUpdated',
    showResourcesButton: '=showResourcesButton',
    selectedKeywords: '=selectedKeywords',
    keywordSelectionEnabled: '=keywordSelectionEnabled',
    showCloseButton: '<showCloseButton'
  },
  templateUrl: 'templates/partials/topic-details.html',
  controller: 'TopicDetailsCtrl',
  link: function link($scope, element) {
    $scope.$watch('editingLabel', isEditing => {
      if (isEditing) {
        setTimeout(() => angular.element(element).find('.label-input').focus())
      }
    })

    angular.element(element).find('.label-input').bind('keydown keypress', event => {
      if (event.which === 13) {
        $scope.$apply(() => $scope.confirmEditLabel());
        event.preventDefault();
      }
    })

    $scope.onClose = () => {
      const fn = $scope.onCloseClicked || noop
      $scope.$applyAsync(fn)
    }
  }
}

angular.module('histograph')
  .directive('hiTopicDetails', () => directive)
  .controller('TopicDetailsCtrl', controller)
  .factory('TopicsService', service)
