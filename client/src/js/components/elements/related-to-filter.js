import { uniq, without } from 'lodash'
import { withStyles, theme } from '../../styles'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  item: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.units(0.3),
  },
  itemsMention: {
    display: 'flex',
    fontWeight: 'bold',
    marginLeft: theme.units(0.5)
  },
  mentionsContainerInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'left',
    padding: [[theme.units(0.5), theme.units(1)]]
  }
}

const template = /* html */ `
  <div class="{{classes.container}}">
    <span ng-if="items.length">{{ title ? title : 'which mentions' }}</span>
    <span ng-if="!items.length">{{ emptyTitle ? emptyTitle : 'related to anyone' }}</span>
    <span class="{{classes.itemsMention}}" ng-show="items.length >= 3">{{items.length}} items</span>
    <div class="{{classes.container}}" ng-show="items.length < 3">
      <div ng-repeat="item in items"
           class="{{classes.item}}">
        <b data-id='{{item.id}}' gasp-type='{{item.type}}'>
          {{item.props|lookup:'name':language:24}}
        </b>
        <button tooltip-append-to-body="true"
                class="{{classes.removeButton}}"
                tooltip='remove {{item.type}} {{item.props|lookup:"name":language:24}} from filters'
                ng-click='removeItem(item)'>
          <i class="fa fa-times-circle"></i>
        </button>
        <span class="{{classes.removeButton}}" ng-if="!$last">OR</span>
      </div>
    </div>

    <!-- dropdown -->
    <div class='grammar-choice related-to btn-group typeahead-menu'
         uib-dropdown 
         is-open="false">
      <button id="related-to-button-{{uid}}"
              type="button"
              class="btn btn-default"
              uib-dropdown-toggle>
        <i class='fa fa-angle-down'></i>
      </button>
      <ul class="uib-dropdown-menu dropdown-menu with-typeahead tk-proxima-nova"
          role="menu"
          aria-labelledby="related-to-button-{{uid}}">
        <li disable-auto-close>
          <div class='typeahead-in-dropdown'>

            <div class="{{classes.mentionsContainerInner}}" ng-show="items.length >= 3">
              <div ng-repeat="item in items"
                  class="{{classes.item}}">
                <b data-id='{{item.id}}' gasp-type='{{item.type}}'>
                  {{item.props|lookup:'name':language:24}}
                </b>
                <button tooltip-append-to-body="true"
                        class="{{classes.removeButton}}"
                        tooltip='remove {{item.type}} {{item.props|lookup:"name":language:24}} from filters'
                        ng-click='removeItem(item)'>
                  <i class="fa fa-times-circle"></i>
                </button>
              </div>
            </div>
    
            <label>which entity</label>
            <form>
              <input autofocus 
                     autocomplete="off"
                     type='text'
                     name='test'
                     ng-model='q'
                     class='form-control'
                     typeahead-editable='false'
                     placeholder='search entity...'
                     typeahead='item for items in typeaheadSuggest($viewValue)'
                     typeahead-wait-ms='100'
                     typeahead-on-select='addValueFromTypeahead($item)'
                     typeahead-template-url='templates/partials/helpers/typeahead.html'/>
            </form>
          </div>
        </li>
      </ul>
    </div>
  </div>
`

function controller($scope, SuggestFactory) {
  $scope.uid = $scope.id
  if (!$scope.value) $scope.value = []

  $scope.typeaheadSuggest = q => {
    if (q.trim().length < 2) return undefined

    return SuggestFactory.get({
      m: 'entity',
      query: q,
      limit: 10,
      language: $scope.language,
    }).$promise.then(function (res) {
      if (res.status !== 'ok') return [];
      return [{ type: 'default' }].concat(res.result.items)
    })
  }

  $scope.addValueFromTypeahead = item => {
    $scope.value = uniq($scope.value.concat([item.id]))
    $scope.q = undefined
  }

  $scope.removeItem = item => {
    $scope.value = without($scope.value, item.id)
  }

  const updateItems = values => {
    if (values.length > 0) {
      SuggestFactory.getUnknownNodes({
        ids: values.join(',')
      }, function (res) {
        $scope.items = res.result.items
      })
    } else {
      $scope.items = []
    }
  }

  $scope.$watch('value', updateItems, true)
  $scope.$watch('value', () => {
    if ($scope.onChanged) {
      const { value } = $scope
      $scope.onChanged({ value })
    }
  }, true)
}

const directive = {
  restrict: 'E',
  scope: {
    value: '=',
    onChanged: '&',
    title: '=',
    emptyTitle: '='
  },
  template,
  controller,
  link($scope) {
    withStyles($scope, styles)
  }
}

angular.module('histograph')
  .directive('hiRelatedToFilter', () => directive)
