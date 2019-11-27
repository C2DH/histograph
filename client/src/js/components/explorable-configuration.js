/* eslint-env browser */
import {
  get, noop, isEmpty,
  assignIn
} from 'lodash'
import { withStyles, theme } from '../styles'

const HelpTooltips = {
  topicModellingScores: {
    aggregationMethod: /* html */ `
    <ul>
      <li>
        <b>MAX</b>
        <p>
          Circle size represents the highest score the topic reached
          in one of the resources in the bin. It <b>does not</b> indicate how
          often the topic has been covered in all the resources in the bin.
        </p>
      </li>
      <li>
        <b>MEAN</b>
        <p>
          Circle size represents the average score of the topic considering
          all the resources in the bin. It roughly indicates how often the topic
          has been covered in the bin but <b>does not</b> indicate the highest 
          score the topic ever reached.
        </p>
      </li>
    </ul>
    `
  }
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignContent: 'stretch',
    fontFamily: '"proxima-nova",sans-serif',
    height: '100%',
    width: '100%',
    borderLeft: '1px solid #E8E8E7'
  },
  panelTop: {
    display: 'flex',
    flexDirection: 'row',
    alignContent: 'stretch',
    justifyContent: 'space-between',
    padding: [['0.9em', '1.2em']],
    flexShrink: 0
  },
  filters: {
    padding: [['0.9em', '1.2em']],
    justifyContent: 'space-between',
  },
  label: {
    extend: theme.text.h2,
    display: 'flex',
    justifyContent: 'left',
    flexDirection: 'row',
    textAlign: 'left',
    flex: 1,
    alignSelf: 'center',
    // borderBottom: `1px solid ${theme.colours.text.light.secondary}`,
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
  removeExplorableButton: {
    display: 'flex',
    alignItems: 'center',
    '& i': {
      marginRight: '0.3em'
    },
    padding: '.2em .6em !important',
  },
  row: {
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'row',
  }
}

function controller($scope, $log, $location, ExplorerService) {
  withStyles($scope, styles)
  $scope.helpTooltips = HelpTooltips

  function parametersFromUrl() {
    const { filters } = $location.search()
    const parsedFilters = isEmpty(filters) ? undefined : JSON.parse(atob(filters))
    $scope.params = { filters: parsedFilters }
  }
  parametersFromUrl()

  const parametersToUrl = (replace = false) => {
    if ($scope.params === undefined) return

    const { filters } = $scope.params
    const queryParams = assignIn({}, $scope.params, {
      filters: isEmpty(filters) ? undefined : btoa(JSON.stringify(filters)),
    })
    const l = $location.search(assignIn({}, $location.search(), queryParams))
    if (replace) l.replace()
  }
  $scope.$on('$locationChangeSuccess', parametersFromUrl)
  $scope.$watch('params.filters', () => parametersToUrl(true), true)

  function loadConfiguration() {
    const config = get($scope.explorerConfig, $scope.plotId)
    if (!config) return
    $scope.label = get(config, 'label')

    ExplorerService.getAspectFilters(config.aspect)
      .then(filters => {
        $scope.filters = filters
      })
      .catch(e => $log.error(
        'Filters configuration:',
        _.get(e, 'data.message', 'Error getting filters configuration')
      ))
  }

  $scope.$watch('explorerConfig', loadConfiguration)
  $scope.$watch('plotId', loadConfiguration)

  $scope.onFilterValueChanged = (plotId, key, value) => {
    if ($scope.params === undefined) return

    const filters = get($scope.params, 'filters', {})
    const plotFilters = get(filters, plotId, {})
    if (isEmpty(value)) {
      delete plotFilters[key]
    } else {
      plotFilters[key] = value
    }
    if (isEmpty(plotFilters)) {
      delete filters[plotId]
    } else {
      filters[plotId] = plotFilters
    }
    $scope.params.filters = filters
  }
}

const template = /* html */ `
<div class="{{classes.container}}">

  <div class="{{classes.panelTop}}">
    <div class="{{classes.label}}">{{label}}</div>
    <button class="{{classes.closeButton}}" ng-click="onClose()">
      <span class="fa fa-times-circle"></span>
    </button>
  </div>

  <div class="{{classes.row}}">
    <button class="btn btn-default {{classes.removeExplorableButton}}"
            ng-click="onRemoveExplorable(plotId); onClose()">
      <i class="fa fa-times"/> <span>Remove from plot</span>
    </button>
  </div>

  <div class="{{classes.filters}}">
    <div hi-explorer-filter="filter"
        hi-explorer-plot-id="{{plotId}}"
        hi-help-tooltips="helpTooltips[id]"
        hi-initial-value="params.filters[plotId][filter.key]"
        hi-on-changed="onFilterValueChanged"
        ng-repeat="filter in filters"
        class="{{ classes.explorerFilter }}">
    </div>
  </div>

</div>
`

const directive = {
  restrict: 'A',
  scope: {
    plotId: '=hiExplorableConfiguration',
    onCloseClicked: '<onClose',
    explorerConfig: '=hiExplorerConfig',
    onRemoveExplorable: '<onRemoveExplorable'
  },
  template,
  controller: 'ExplorableConfigurationCtrl',
  link: function link($scope) {
    $scope.onClose = () => {
      const fn = $scope.onCloseClicked || noop
      $scope.$applyAsync(fn)
    }
  }
}

angular.module('histograph')
  .directive('hiExplorableConfiguration', () => directive)
  .controller('ExplorableConfigurationCtrl', controller)
