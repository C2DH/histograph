import { uniq, concat, without } from 'lodash'
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
    width: '1.5em',
    height: '1.5em',
    padding: 0
  },
  dropdownPanel: {
    padding: [['1.2em', '0.8em']]
  },
  form: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    '& input': {
      height: '2.5em',
      margin: [[0, '0.3em']]
    }
  },
  input: {
    minWidth: '10em'
  },
  items: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    '& div': {
      margin: [[0, '0.2em']],
      '& span': {
        fontWeight: 700
      },
      '& .fa': {
        margin: [[0, '0.2em']],
      }
    }
  }
}

function controller($scope) {
  withStyles($scope, styles)

  $scope.isDropdownOpen = false
  $scope.uid = $scope.$id
  if ($scope.items === undefined) $scope.items = []

  $scope.addItem = () => {
    $scope.items = uniq(concat($scope.items, $scope.currentInput))
    $scope.currentInput = undefined
    $scope.isDropdownOpen = false
  }

  $scope.removeItem = item => {
    $scope.items = without($scope.items, item)
  }
}

// eslint-disable-next-line operator-linebreak
const template =
  /* html */
  `
    <div class='{{classes.container}}'>
      <div class='{{classes.label}}'>{{label}}</div>
      <div class='{{classes.items}}'>
        <div ng-repeat="item in items">
          <span>{{item}}</span>
          <i class="fa fa-times-circle" ng-click="removeItem(item)"></i>
          {{!$last ? 'AND ' : ''}}
        </div>
      </div>
      <div class="btn-group" uib-dropdown is-open="isDropdownOpen">
        <button id="open-button-{{uid}}" type="button" class="btn btn-default {{classes.dropdownButton}}" uib-dropdown-toggle>
          <i class='fa fa-angle-down'></i>
        </button>
        <ul class="uib-dropdown-menu dropdown-menu {{classes.dropdownPanel}}" role="menu" aria-labelledby="open-button-{{uid}}">
          <li disable-auto-close>
            <div>
              <form ng-submit="addItem()" class="{{classes.form}}">
                <input autofocus type='text' name='test' ng-model='currentInput' class='form-control {{classes.input}}' typeahead-editable='false' placeholder='enter keyword...' />
                <input type="submit" value="Add" class="btn btn-default"/>
              </form>
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
    items: '=ngModel'
  },
  template,
  controller: 'TextItemsFilterCtrl'
}


angular.module('histograph')
  .directive('hiTextItemsFilter', () => directive)
  .controller('TextItemsFilterCtrl', controller)
