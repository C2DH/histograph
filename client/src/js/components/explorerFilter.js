import {
  get, isFunction, noop, isEqual
} from 'lodash'
import { withStyles, theme } from '../styles'
import { parseSolrQuery, formatSolrQuery } from '../utils'

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
  },
  chips: {
    '& .md-chips': {
      border: `1px solid ${theme.colours.text.light.secondary}`,
      boxShadow: 'none',

      '&.md-focused': {
        boxShadow: 'none',
      },

      '& md-chip': {
        height: '2em',
        lineHeight: '2em',
        fontSize: '14px',

        '& .md-chip-remove': {
          width: '2em',
          height: '2em',

          '& md-icon': {
            minWidth: '1.2em',
            minHeight: '1.2em',
          }
        }
      },

      '& .md-input': {
        fontSize: '14px',
      }
    }
  },
  radiobuttons: {
    display: 'flex',
    flexDirection: 'row',
    marginTop: '1em',
    '& md-radio-button': {
      flex: '0 1 auto',
      marginRight: '.5em',
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
                tooltip-append-to-body="false"
                tooltip-placement="left-top">
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

      <div ng-if="config.type === 'solr-keywords'">
        <md-chips ng-model="listValue"
                  id="autocompleteTitle"
                  md-removable="true"
                  md-enable-chip-edit="true"
                  input-aria-label="Keyword"
                  placeholder="Enter a keyword..."
                  class="{{ classes.chips }}">
          <md-autocomplete md-selected-item="keywordsAutocomplete.selectedItem"
                           md-search-text="keywordsAutocomplete.searchText"
                           md-items="item in keywordsSearch(keywordsAutocomplete.searchText)"
                           md-item-text="item.name"
                           input-aria-describedby="autocompleteTitle"
                           placeholder="Enter a keyword...">
            <span md-highlight-text="keywordsAutocomplete.searchText">{{item.name}}</span>
          </md-autocomplete>
        </md-chips>
        <span>Press Enter to add a keyword</span>

        <md-radio-group ng-model="solr.keywordGroupingMethod" class="{{ classes.radiobuttons }}">
          <md-radio-button value="AND" class="md-primary">AND</md-radio-button>
          <md-radio-button value="OR" class="md-primary">OR</md-radio-button>
        </md-radio-group>
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

  $scope.keywordsAutocomplete = {}
  $scope.textInputValue = {}
  $scope.listValue = []
  $scope.solr = { keywordGroupingMethod: 'AND' }

  function onValueUpdated() {
    if (!$scope.config) return
    const { type } = $scope.config
    const { value } = $scope

    if (value === undefined) return

    if (type === 'solr-keywords') {
      const [keywords, method] = parseSolrQuery(value || '')
      $scope.solr.keywordGroupingMethod = method
      $scope.listValue = keywords
    }
    if (type === 'multi-selection') $scope.textInputValue.value = value
  }

  $scope.$watch('value', onValueUpdated, true)
  $scope.$watch('config', onValueUpdated, true)

  $scope.$watch('initialValue', initialValue => {
    if (initialValue === undefined || $scope.value !== undefined) return
    $scope.value = $scope.initialValue
  }, true)

  function updateValueForSolr() {
    const values = $scope.listValue
    const method = $scope.solr.keywordGroupingMethod
    if (values === undefined) return
    $scope.value = formatSolrQuery(values, method)
  }
  $scope.$watch('listValue', (newVal, oldVal) => {
    if (isEqual(newVal, oldVal)) return
    updateValueForSolr()
  }, true)
  $scope.$watch('solr', (newVal, oldVal) => {
    if (isEqual(newVal, oldVal)) return
    updateValueForSolr()
  }, true)

  $scope.addOrRemoveMultiSelectionItem = item => {
    if ($scope.value !== undefined && $scope.value.indexOf(item) >= 0) {
      $scope.value = $scope.value.filter(v => v !== item)
    } else if ($scope.value === undefined) {
      $scope.value = [item]
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

  // TODO: coming soon
  // eslint-disable-next-line no-unused-vars
  $scope.keywordsSearch = keyword => Promise.resolve([])
}

angular.module('histograph')
  .directive('hiExplorerFilter', () => directive)
  .controller('ExplorerFilterCtrl', controller)
