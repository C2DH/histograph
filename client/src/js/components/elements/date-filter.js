import moment from 'moment'
import { withStyles, theme } from '../../styles'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center'
  },
  label: {
    marginRight: theme.units(0.5)
  },
  date: {
    fontWeight: 700,
    display: 'block',
    position: 'relative',
    '& span': {
      '&:focus': {
        outline: 0
      }
    }
  },
  removeButton: {
    background: 'none',
    border: 'none',
    display: 'flex',
    padding: 0,
    marginLeft: theme.units(0.3),
    '& .fa': {
      lineHeight: '18px'
    },
    '&:focus': {
      outline: 0
    }
  }
}

function controller($scope) {
  withStyles($scope, styles)

  $scope.dateModel = moment.utc($scope.date).toDate()
  $scope.isDatepickerOpened = false

  $scope.removeItem = () => {
    if ($scope.onRemove) $scope.onRemove()
  }
  $scope.toggleDatepicker = () => {
    $scope.isDatepickerOpened = !$scope.isDatepickerOpened
  }

  $scope.$watch('date', () => {
    if ($scope.date === undefined) {
      $scope.dateModel = undefined
    } else {
      $scope.dateModel = moment.utc($scope.date).toDate()
    }
  })

  $scope.$watch('dateModel', value => {
    if (value === undefined) {
      $scope.onDateChanged({ date: undefined })
    } else {
      const newDate = moment.utc(value).format('YYYY-MM-DD')
      if (newDate !== $scope.date) {
        if ($scope.onDateChanged) {
          $scope.onDateChanged({ date: newDate })
        }
      }
    }
  })
}

const directive = {
  restrict: 'A',
  template: /* html */ `
  <div class="{{classes.container}}">
    <div class="{{classes.label}}">{{label}}</div>
    <div class="{{classes.container}}">
      <div class="{{classes.date}}">
        <span uib-datepicker-popup
              ng-model="dateModel"
              show-button-bar="false"
              init-date="dateModel"
              is-open="isDatepickerOpened"
              ng-click="toggleDatepicker()">
          {{date}}
        </span>
      </div>
      <button class="{{classes.removeButton}}" ng-click='removeItem()'>
        <i class="fa fa-times-circle"></i>
      </button>
    </span>
  </span>
  `,
  controller: 'HiDateFilterCtrl',
  scope: {
    label: '=label',
    date: '<hiDateFilter',
    onRemove: '&onRemove',
    onDateChanged: '&onDateChanged'
  }
}

angular.module('histograph')
  .directive('hiDateFilter', () => directive)
  .controller('HiDateFilterCtrl', controller)
