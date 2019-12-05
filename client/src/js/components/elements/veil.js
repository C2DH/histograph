import { withStyles } from '../../styles'

const style = {
  veil: {
    background: '#fff',
    opacity: 0.5,
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 1,
  }
}

const template = /* html */ `
  <div class="{{classes.veil}}">
    <div class="loader animated">
      <div class="sk-double-bounce">
        <div class="sk-child sk-double-bounce1"></div>
        <div class="sk-child sk-double-bounce2"></div>
      </div>
    </div>
  </div>
`

const directive = {
  restrict: 'A',
  template,
  scope: {},
  // eslint-disable-next-line object-shorthand
  link: $scope => {
    withStyles($scope, style)
  }
}

angular.module('histograph')
  .directive('hiVeil', () => directive)
