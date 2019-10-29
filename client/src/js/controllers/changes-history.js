import { get } from 'lodash'
import { utc } from 'moment'
import { withStyles, theme } from '../styles'

const styles = {
  container: {
    padding: [[theme.units(1.5), theme.units(2)]],
    overflowY: 'scroll',
    position: 'absolute',
    height: '100%',
    width: '100%',
  },
  listContainer: {
    padding: [[theme.units(1), 0, theme.units(2), 0]],
    height: '100%',
    overflowY: 'scroll',
  },
  action: {
    display: 'flex',
    flexDirection: 'row',
    flex: '1 0 auto',
    justifyContent: 'space-between',
  },
  label: {
    display: 'flex',
    flexBasis: '80%',
  },
  meta: {
    display: 'flex',
    flexBasis: '20%',
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  loadMoreBtn: {
    background: 'black',
    color: 'white',
  }
}


function getLabel(action) {
  switch (action.type) {
    case 'unlink-entity':
      return `Removed entity "${get(action, 'meta.entity.name')}" mention from resource "${get(action, 'meta.resource.name')}"`
    case 'link-entity':
      return `Added entity "${get(action, 'meta.entity.name')}" mention to resource "${get(action, 'meta.resource.name')}"`
    case 'change-entity-type':
      return `Entity "${get(action, 'meta.entity.name')}" type changed from "${get(action, 'meta.entity.type')}" to "${get(action, 'meta.newType')}"`
    case 'merge-entities':
      return `Merged entities ${get(action, 'meta.originalEntities.names', []).map(v => `"${v}"`).join(', ')} into "${get(action, 'meta.newEntity.name')}"`
    default:
      return '[Unknown action]'
  }
}

function getTimestamp(action) {
  return utc(action.performedAt).fromNow()
}

function getUsername(action) {
  return action.initiatedBy
}

angular.module('histograph')
  .controller('ChangesHistoryCtrl', function ($scope, $log, ActionsService) {
    withStyles($scope, styles)

    $scope.limit = 50
    $scope.actions = []

    $scope.loadMoreItems = () => {
      ActionsService.getPerformedActions($scope.actions.length, $scope.limit)
        .then(actions => {
          $scope.actions = $scope.actions.concat(actions)
        })
        .catch(e => {
          $log.error(`Could not get actions: ${e.message}`)
        })
    }

    $scope.loadMoreItems()

    $scope.getLabel = getLabel
    $scope.getTimestamp = getTimestamp
    $scope.getUsername = getUsername
  })
