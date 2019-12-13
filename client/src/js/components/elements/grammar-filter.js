import { withStyles, theme } from '../../styles'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefix: {
    marginRight: theme.units(0.5)
  },
  dropdownContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center'
  }
}

const template = /* html */ `
  <div class="{{classes.container}}">
    <span ng-if="prefix" class="{{classes.prefix}}">{{prefix}}</span>
    <div class="grammar-choice ruler {{classes.dropdownContainer}}">
      <span>{{selectionLabel}}</span>
      <div class="btn-group" uib-dropdown is-open="false">
      <button id="grammar-filter-dropdown-btn-{{uid}}"
              type="button"
              class="btn btn-default"
              uib-dropdown-toggle>
        <i class='fa fa-angle-down'></i>
      </button>
      <ul class="uib-dropdown-menu dropdown-menu"
          role="menu"
          aria-labelledby="grammar-filter-dropdown-btn-{{uid}}">
        <li ng-repeat="item in choices">
          <a ng-click='setChoice(item)'>
            {{item.label}}
          </a>
        </li>
      </ul>
      </div>
    </div>
  </div>
`

function controller($scope) {
  $scope.uid = $scope.id

  $scope.$watch('value', v => {
    const selectionLabel = $scope.choices
      .filter(({ value }) => value === v)
      .map(({ label }) => label)[0]
    $scope.selectionLabel = selectionLabel === undefined
      ? '' : selectionLabel
  })

  $scope.setChoice = item => {
    const { value } = item
    $scope.onChanged({ value })
  }
}

const directive = {
  restrict: 'E',
  scope: {
    prefix: '=',
    choices: '=',
    value: '=',
    onChanged: '&'
  },
  template,
  controller,
  link($scope) {
    withStyles($scope, styles)
  }
}

angular.module('histograph')
  .directive('hiGrammarFilter', () => directive)
