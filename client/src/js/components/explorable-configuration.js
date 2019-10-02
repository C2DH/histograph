import {
  get, cloneDeep, assignIn, noop,
  includes, without, uniq, concat
} from 'lodash'
import { withStyles, theme } from '../styles'

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
  label: {
    extend: theme.text.h3,
    display: 'flex',
    justifyContent: 'left',
    flexDirection: 'row',
    textAlign: 'left',
    flex: 1,
    cursor: 'text',
    borderBottom: `1px solid ${theme.colours.text.light.secondary}`,
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
  editButton: {
    background: 'none',
    border: 'none',
    outline: 'none',
    padding: '0.2em .7em',
  },
  keywordsLabel: {
    margin: [['0em', '1.2em']],
    textTransform: 'uppercase',
    flexShrink: 0
  },
  keywordCloud: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: [['0.9em', '1.2em']],
    overflowY: 'scroll',
    '& span': {
      marginRight: '.3em',
      marginBottom: '.3em',
      color: theme.colours.text.light.secondary,
      background: '#22222277',
      padding: '0em .6em',
      borderRadius: '1em',
    }
  },
  labelEditPanel: {
    display: 'flex',
    alignContent: 'stretch',
    alignItems: 'center',
    borderBottom: `1px solid ${theme.colours.text.light.secondary}`,
    justifyContent: 'flex-start',
    flexGrow: 1,
    '& input': {
      border: 'none',
      outline: 'none',
      background: '#ffffff22',
      padding: '.2em .8em 0em',
      marginBottom: '.2em',
    },
  },
  buttonsPanel: {
    display: 'flex',
    alignContent: 'stretch',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    flexShrink: 0,
  },
  showResourcesButton: {
    background: 'none',
    display: 'inline-flex',
    padding: [['0.3em', '0.9em']],
    outline: 'none',
    borderWidth: '1px',
    borderStyle: 'solid',
    '& .fa': {
      marginRight: '0.5em'
    }
  },
  selectedKeyword: {
    color: '#222222 !important',
    background: `${theme.colours.text.light.secondary} !important`,
  },
  keywordSelectable: {
    cursor: 'pointer'
  }
}

function controller($scope, $log, $location) {
  withStyles($scope, styles)

  function loadConfiguration() {
    const config = get($scope.explorerConfig, $scope.plotId)
    if (!config) return
    $scope.label = get(config, 'label')
  }

  $scope.$watch('explorerConfig', loadConfiguration)
  $scope.$watch('plotId', loadConfiguration)
}

const template = /* html */ `
<div class="{{classes.container}}">

  <div class="{{classes.panelTop}}">
    <div class="{{classes.label}}">{{label}}</div>
    <button class="{{classes.closeButton}}" ng-click="onClose()">
      <span class="fa fa-times-circle"></span>
    </button>
  </div>

</div>
`

const directive = {
  restrict: 'A',
  scope: {
    plotId: '=hiExplorableConfiguration',
    onCloseClicked: '&onClose',
    explorerConfig: '=hiExplorerConfig',
    // onTopicUpdated: '&onTopicUpdated',
    // showResourcesButton: '=showResourcesButton',
    // selectedKeywords: '=selectedKeywords',
    // keywordSelectionEnabled: '=keywordSelectionEnabled',
    // showCloseButton: '<showCloseButton'
  },
  template,
  controller: 'ExplorableConfigurationCtrl',
  link: function link($scope, element) {
    // $scope.$watch('editingLabel', isEditing => {
    //   if (isEditing) {
    //     setTimeout(() => angular.element(element).find('.label-input').focus())
    //   }
    // })

    // angular.element(element).find('.label-input').bind('keydown keypress', event => {
    //   if (event.which === 13) {
    //     $scope.$apply(() => $scope.confirmEditLabel());
    //     event.preventDefault();
    //   }
    // })

    $scope.onClose = () => {
      const fn = $scope.onCloseClicked || noop
      $scope.$applyAsync(fn())
    }
  }
}

angular.module('histograph')
  .directive('hiExplorableConfiguration', () => directive)
  .controller('ExplorableConfigurationCtrl', controller)
