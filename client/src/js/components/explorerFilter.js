import { get, isFunction, noop } from 'lodash'
import { withStyles } from '../styles'

const styles = {
  container: {
    border: '1px solid red'
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
}

const directive = {
  restrict: 'A',
  scope: {
    config: '=hiExplorerFilter',
    onChanged: '=hiOnChanged',
    initialValue: '=hiInitialValue',
    plotId: '@hiExplorerPlotId'
  },
  /* html */
  template: `
    <div class={{ classes.container }}>
      <!-- multi-selection -->
      <div class="dropdown" ng-if="config.type === 'multi-selection'">
        <div class="btn-group" uib-dropdown is-open="false">
          <button id="topic-modelling-aspect-value-selector-btn" type="button" class="btn btn-default btn-line" uib-dropdown-toggle>
            {{config.label}} {{ value.join(', ') }} <span class="caret"></span>
          </button>
          <ul class="uib-dropdown-menu dropdown-menu" role="menu" aria-labelledby="topic-modelling-aspect-value-selector-btn">
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
  controller: function controller($scope) {
    withStyles($scope, styles)

    $scope.textInputValue = {}

    if ($scope.value === undefined && $scope.initialValue) {
      $scope.value = $scope.initialValue
      $scope.textInputValue.value = $scope.initialValue
    }

    $scope.$watch('config', config => {
      if (!config) return

      if ($scope.value === undefined) {
        $scope.value = config.type === 'multi-selection'
          ? [] : ''
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

    $scope.$watch('value', v => {
      const fn = isFunction($scope.onChanged) ? $scope.onChanged : noop
      fn($scope.plotId, get($scope.config, 'key'), v)
    }, true)
  }
}

angular.module('histograph')
  .directive('hiExplorerFilter', () => directive)
