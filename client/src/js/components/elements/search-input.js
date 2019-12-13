import { withStyles, theme } from '../../styles'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative'
  },
  label: {
    marginRight: theme.units(0.5)
  },
  input: {
    background: 'transparent',
    fontSize: '13px',
    color: 'black',
    width: '140px',
    height: '28px !important',
    paddingRight: '12px'
  },
  searchButton: {
    right: '0px',
    position: 'absolute',
    padding: '0px 4px',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    '& i': {
      color: theme.colours.text.light.secondary
    },
    '&:focus': {
      outline: 'none'
    }
  }
}

function controller($scope) {
  $scope.$watch('value', v => { $scope.editValue = v })
  $scope.submit = () => {
    if ($scope.onChanged) $scope.onChanged({ value: $scope.editValue })
  }
}

const template = /* html */ `
<div class="{{classes.container}}">
  <span class="{{classes.label}}">search</span>
  <input class="{{classes.input}} form-control"
         ng-model="editValue"
         hg-on-enter="submit()"/>
  <button class="{{classes.searchButton}}" ng-click="submit()">
    <i class="fa fa-search"></i>
  </button>
</div>
`

const directive = {
  restrict: 'E',
  template,
  controller: 'HiSearchInputCtrl',
  link($scope) { withStyles($scope, styles) },
  scope: {
    value: '=',
    onChanged: '&'
  }
}

angular.module('histograph')
  .directive('hiSearchInput', () => directive)
  .controller('HiSearchInputCtrl', controller)
