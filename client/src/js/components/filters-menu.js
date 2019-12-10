import { zip, assignIn } from 'lodash'
import { withStyles, theme } from '../styles'

const style = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
    width: '100%',
    boxShadow: '0px 6px 6px #33333333',
    height: 'auto',
    borderBottom: '1px solid #d8d8d8',
    background: 'white',
    minHeight: theme.units(3.2),
    padding: [[0, theme.units(5)]]
  },
  element: {
    margin: [[0, theme.units(0.5)]],
    display: 'flex',
    flexDirection: 'row'
  },
  searchElement: {
    display: 'flex',
    flexDirection: 'row',
    '& p': {
      margin: 0
    },
    '& b': {
      marginLeft: theme.units(1)
    }
  }
}

const template = /* html */ `
  <div class="tk-proxima-nova {{classes.container}}">
    <div ng-repeat="element in elements" class="{{classes.element}}">
      <!-- search -->
      <div ng-if="element.type === 'search'"
           class="{{classes.searchElement}}">
        <p>search</p>
        <b>{{filters[$index]}}</b>
      </div>

      <!-- grammar -->
      <hi-grammar-filter ng-if="element.type === 'grammar'"
                         prefix="element.prefix"
                         choices="element.choices"
                         value="filters[$index]"
                         on-changed="filterValueUpdated($index, value)">
      </hi-grammar-filter>

      <!-- related to -->
      <hi-related-to-filter ng-if="element.type === 'related-to'"
                            value="filters[$index]"
                            onChanged="filterValueUpdated($index, value)">
      </hi-related-to-filter>

      <!-- without -->
      <hi-related-to-filter ng-if="element.type === 'without'"
                            value="filters[$index]"
                            onChanged="filterValueUpdated($index, value)"
                            title="'excluding'"
                            empty-title="'excluding no one'">
      </hi-related-to-filter>

      <!-- from and to -->
      <div ng-if="element.type === 'from'"
           ng-show="filters[$index]"
           hi-date-filter="filters[$index]"
           label="'from'"
           on-remove="filterValueUpdated($index)"
           on-date-changed="filterValueUpdated($index, date)"></div>

      <div ng-if="element.type === 'to'"
           ng-show="filters[$index]"
           hi-date-filter="filters[$index]"
           label="'to'"
           on-remove="filterValueUpdated($index)"
           on-date-changed="filterValueUpdated($index, date)"></div>
    </div>
  </div>
`

const ElementTypeToQueryParameter = {
  search: 'query',
  'related-to': 'with',
  without: 'without',
  from: 'from',
  to: 'to'
}

const ElementTypeToParser = {
  'related-to': v => (v ? v.split(',') : []),
  without: v => (v ? v.split(',') : [])
}

const ElementTypeToSerializer = {
  'related-to': v => (v && v.length > 0 ? v.join(',') : undefined),
  without: v => (v && v.length > 0 ? v.join(',') : undefined)
}

function controller($scope, $location) {
  const deserializeFilterValues = () => {
    $scope.filters = $scope.elements.map(element => {
      const queryParameterName = ElementTypeToQueryParameter[element.type]
      let value
      if (queryParameterName) {
        value = $location.search()[queryParameterName]
      } else if ($scope.values) {
        value = $scope.values[element.type]
      }
      const valueParser = ElementTypeToParser[element.type]
      return valueParser ? valueParser(value) : value
    })
  }

  const serializeFilterValues = (values, oldValues) => {
    const queryParameters = {}

    zip(values || [], oldValues || []).forEach(([value, oldValue], idx) => {
      if (value !== oldValue) {
        const element = $scope.elements[idx]
        const serializer = ElementTypeToSerializer[element.type]
        const queryParameterName = ElementTypeToQueryParameter[element.type]
        if (queryParameterName) {
          queryParameters[queryParameterName] = serializer ? serializer(value) : value
        } else if ($scope.onElementChanged) {
          $scope.onElementChanged({
            type: element.type,
            value
          })
        }
      }
    })

    if (Object.keys(queryParameters).length > 0) {
      $location.search(assignIn($location.search(), queryParameters))
    }
  }

  $scope.$on('$locationChangeSuccess', deserializeFilterValues)
  $scope.$watch('elements', deserializeFilterValues, true)
  $scope.$watch('filters', serializeFilterValues, true)

  $scope.filterValueUpdated = (filterIndex, value) => {
    $scope.filters[filterIndex] = value
  }
}

const directive = {
  restrict: 'E',
  scope: {
    elements: '=',
    values: '=',
    onElementChanged: '&'
  },
  template,
  controller,
  link($scope) {
    withStyles($scope, style)
  }
}

angular.module('histograph')
  .directive('hiFiltersMenu', () => directive)
