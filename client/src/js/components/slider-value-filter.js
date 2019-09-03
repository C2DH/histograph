import {
  isNaN, isUndefined, isString, isEmpty
} from 'lodash'
import { withStyles } from '../styles'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    '& div': {
      display: 'flex',
      alignItems: 'center',
    }
  },
  label: {
    marginRight: '0.2em',
  },
  dropdownButton: {
    width: '3em',
    height: '2em',
    padding: 0,
    borderRadius: '4px !important'
  },
  dropdownPanel: {
    padding: [['1.2em', '0.8em']]
  },
  sliderContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderValue: {
    width: '3em',
    height: '2em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
}

function controller($scope) {
  withStyles($scope, styles)

  $scope.uid = $scope.$id
  $scope.isDropdownOpen = false
  $scope.$watch('value', value => {
    if (isUndefined(value)) return
    $scope.sliderValue = isString(value) ? parseFloat(value) : value
  })

  $scope.updateSliderValue = () => {
    $scope.value = isString($scope.sliderValue)
      ? parseFloat($scope.sliderValue) : $scope.sliderValue
    $scope.isDropdownOpen = false
  }
}

const template = /* html */ `
<div class='{{classes.container}}'>
  <div class='{{classes.label}}'>{{label}}</div>
  <div class="btn-group" uib-dropdown is-open="isDropdownOpen">
  <button id="open-button-{{uid}}" type="button" class="btn btn-default {{classes.dropdownButton}}" uib-dropdown-toggle>
    {{sliderValue}}
  </button>
  <ul class="uib-dropdown-menu dropdown-menu {{classes.dropdownPanel}}" role="menu" aria-labelledby="open-button-{{uid}}">
    <li disable-auto-close>
      <div class="{{classes.sliderContainer}}">
        <input type="range" id="range-{{uid}}" min="0" max="1" step="0.01" ng-model="sliderValue" ng-mouseup="updateSliderValue()">
        <span class="{{classes.sliderValue}}">{{sliderValue}}</span>
      </div>
    </li>
  </ul>
</div>
</div>
`

const directive = {
  restrict: 'A',
  scope: {
    label: '@label',
    value: '=ngModel'
  },
  template,
  controller: 'SliderValueFilterCtrl',
  link: function link($scope) {
    $scope.value = parseFloat($scope.value)
    if (isNaN($scope.value)) $scope.value = 0
  }
}

angular.module('histograph')
  .directive('hiSliderValueFilter', () => directive)
  .controller('SliderValueFilterCtrl', controller)
