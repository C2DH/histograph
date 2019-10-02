import { get, isFunction, noop } from 'lodash'
import { withStyles } from '../styles'

const styles = {
  container: {
    // border: '1px solid red'
  },
  textInput: {
    display: 'inline-flex',
    width: 'auto',
  },
  searchButton: {
    '& .fa': {
      fontSize: '1.15em',
    }
  },
  row: {
    display: 'flex',
    // justifyContent: 'center',
    // alignItems: 'center'
  },
  tooltipHotspot: {
    display: 'flex',
    padding: [[0, '0.5em']],
    color: '#777',
    '& .fa': {
      cursor: 'pointer'
    }
  },
  tooltipBody: {
    '& ul': {
      margin: 0,
      padding: 0,
      listStyleType: 'none',
      textAlign: 'left'
    }
  }
}

const directive = {
  restrict: 'A',
  scope: {
    config: '=hiExplorerFilter',
    onChanged: '=hiOnChanged',
    initialValue: '=hiInitialValue',
    plotId: '@hiExplorerPlotId',
    helpTooltips: '<hiHelpTooltips'
  },

  template: /* html */ `
    <div class="{{ classes.container }}">
      <!-- selection -->
      <div ng-if="config.type === 'selection'" class="dropdown {{classes.row}}">
        <div class="btn-group {{classes.row}}" uib-dropdown is-open="false">
          <button id="topic-modelling-aspect-value-single-selector-btn-{{uid}}" type="button" class="btn btn-default btn-line" uib-dropdown-toggle>
            {{config.label}}: {{ value }} <span class="caret"></span>
          </button>
          <ul class="uib-dropdown-menu dropdown-menu" role="menu" aria-labelledby="topic-modelling-aspect-value-single-selector-btn-{{uid}}">
            <li class="{{ value.indexOf(item) >= 0 ? 'active' : '' }}" ng-repeat="item in config.values">
              <a ng-click='selectItem(item)'>{{ item }}</a>
            </li>
          </ul>
        </div>
        <div class="{{classes.tooltipHotspot}}" ng-if="config.showHelpTooltip && helpTooltips[config.key]">
          <span class="fa fa-question-circle" 
                uib-tooltip-html="helpTooltips[config.key]"
                tooltip-class="{{classes.tooltipBody}}"
                tooltip-append-to-body="true">
          </span>
        </div>
      </div>

      <!-- multi-selection -->
      <div class="dropdown" ng-if="config.type === 'multi-selection'">
        <div class="btn-group" uib-dropdown is-open="false">
          <button id="topic-modelling-aspect-value-selector-btn-{{uid}}" type="button" class="btn btn-default btn-line" uib-dropdown-toggle>
            {{config.label}} {{ value.join(', ') }} <span class="caret"></span>
          </button>
          <ul class="uib-dropdown-menu dropdown-menu" role="menu" aria-labelledby="topic-modelling-aspect-value-selector-btn-{{uid}}">
            <li class="{{ value.indexOf(item) >= 0 ? 'active' : '' }}" ng-repeat="item in config.values">
              <a ng-click='addOrRemoveMultiSelectionItem(item)'>{{ item }}</a>
            </li>
          </ul>
        </div>
        <span ng-click="clearValue()"
              class="clear-button"
              ng-show="value.length > 0">
          <i class="fa fa-times-circle"></i>
        </span>
      </div>

      <!-- Text input -->
      <div ng-if="config.type === 'value'">
        <input type="text"
               ng-model="textInputValue.value"
               placeholder="{{config.label}}"
               class="form-control {{ classes.textInput }}"/>
        <button ng-click="submitTextInputValue()" class="btn btn-default {{ classes.searchButton }}">
          <i class="fa fa-search"></i>
        </button>
      </div>
    </div>
  `,
  // link: function link($scope, element) {
  // },
  controller: 'ExplorerFilterCtrl'
}

function controller($scope) {
  withStyles($scope, styles)

  $scope.uid = $scope.$id

  $scope.textInputValue = {}

  if ($scope.value === undefined && $scope.initialValue) {
    $scope.value = $scope.initialValue
    $scope.textInputValue.value = $scope.initialValue
  }

  $scope.$watch('config', config => {
    if (!config) return

    if ($scope.value === undefined) {
      $scope.value = ''
      if (config.type === 'multi-selection') $scope.value = []
      // eslint-disable-next-line prefer-destructuring
      if (config.type === 'selection') $scope.value = config.values[0]
    }
  }, true)

  $scope.addOrRemoveMultiSelectionItem = item => {
    if ($scope.value.indexOf(item) >= 0) {
      $scope.value = $scope.value.filter(v => v !== item)
    } else {
      $scope.value.push(item)
    }
  }

  $scope.clearValue = () => {
    if (get($scope.config, 'type') === 'multi-selection') {
      $scope.value = []
    } else {
      $scope.value = ''
    }
  }

  $scope.submitTextInputValue = () => {
    $scope.value = $scope.textInputValue.value
  }

  $scope.selectItem = item => { $scope.value = item }

  $scope.$watch('value', v => {
    const fn = isFunction($scope.onChanged) ? $scope.onChanged : noop
    fn($scope.plotId, get($scope.config, 'key'), v)
  }, true)
}

angular.module('histograph')
  .directive('hiExplorerFilter', () => directive)
  .controller('ExplorerFilterCtrl', controller)
