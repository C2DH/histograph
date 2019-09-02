import {
  isUndefined, assignIn
} from 'lodash'
import { withStyles, theme } from '../styles'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignContent: 'stretch',
    height: '100%'
  },
  resourceItems: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  noResourcesLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    fontSize: '1.5em',
    fontFamily: '"proxima-nova",sans-serif'
  },
  moreButton: {
    width: '100%'
  },
  resourceItem: {
    padding: '0.5em',
    overflow: 'auto'
  },
  '@media screen and (min-width: 768px)': {
    resourceItem: { flex: '0 0 33%' }
  },
  '@media screen and (min-width: 1200px)': {
    resourceItem: { flex: '0 0 25%' }
  }
}

function controller($scope, $log, HgSettings) {
  withStyles($scope, styles)

  $scope.busyCounter = 0

  $scope.loadMoreResources = () => {
    if ($scope.busyCounter !== 0) return

    const params = assignIn({}, $scope.params, {
      limit: $scope.resourcesPageLimit,
      offset: $scope.resources.items.length,
    })

    $scope.busyCounter += 1
    $scope.loadResources(params)
      .then(results => {
        $scope.resources.items = $scope.resources.items.concat(results.result.items)
        $scope.resources.meta = {
          totalResources: results.info.total_items
        }
      })
      .catch(e => {
        $log.error('Could not get resources from the API', e.message)
      })
      .finally(() => {
        $scope.busyCounter -= 1
      })
  }

  $scope.$watch('params', () => {
    $scope.resources = { items: [] }
    $scope.loadMoreResources()
  }, true)

  $scope.getImageUrl = function (relatedItem) {
    if (relatedItem.props.iiif_url) {
      return relatedItem.props.iiif_url.replace(/info.json$/, 'full/pct:20/0/default.jpg');
    }
    return `${HgSettings.apiBaseUrl}/media/${relatedItem.props.url}`;
  }
}

const itemTemplate = /* html */ `
<div class="related animated fadeIn {{resource.users.length? 'with-users':''}}">
  <div class='user sans-serif' ng-repeat='user in resource.users' ng-if='$index == 0'>
    {{user.username}} <strong>{{user.type}}</strong> {{user.last_modification_time*1000|date:'longDate'}}
  </div>
  <div class='actions-wrapper'>
    <div class='actions '>
      <div class="btn-group">
        <button class='btn btn-default action' uib-tooltip='{{tooltip.resource.add.to.myselection|translate}}' tooltip-append-to-body="true" ng-click='pinResource(resource.id, true)'>
          <i class='fa fa-thumb-tack'></i>
        </button>
      </div>
    </div>
  </div>   
  <div class="meta">
    <span class='type sans-serif' translate='resource.type.{{resource.props.type}}'></span> {{$index + 1}} of {{resources.meta.totalResources}}
  </div>
  <h4>
    <a href='#/r/{{resource.id}}'>
      <span lookup context='resource' field='title' language='language'></span>
    </a>
  </h4>
        
  <div class="meta">
    <span gasp-type="date" class="empty" ng-if="!resource.props.start_time">no date found</span>
    <span class='date' ng-if="resource.props.start_time"> {{resource.props | guessInterval}}</span>
    <span ng-if='resource.matches.length' class='tags'> — <i translate>resource.in_between</i>:
      <span ng-repeat="mat in resource.matches">
        <span class="tag match" data-id='{{mat.id}}' gasp-type='{{mat.type}}' gasp-parent='{{resource.type}}-{{resource.id}}'>{{mat.props.name}}</span>{{$last? '':  ', '}}
      </span>
    </span>
    <span ng-if='resource.themes.length' class='tags'> — <i translate>resource.themes.mentioned</i>:
      <span ng-repeat="the in resource.themes">
        <span class="tag theme" data-id='{{the.id}}' gasp-type='theme' gasp-parent='{{resource.type}}-{{resource.id}}'>{{the.props.name}}</span>
        {{$last? '':  ', '}}
      </span>
    </span>

    <span ng-if='resource.persons.length' class='tags'> — <i translate='resource.people.mentioned'></i>:
      <span ng-repeat="tag in resource.persons" ng-include='"templates/partials/entity-tag.html"' ng-init='item=relatedItem'></span>  
    </span>

  </div>
           
  <div class='img-wrapper' ng-if='hasImage(resource)'>
    <a ng-href='/#/r/{{resource.id}}'>
      <div class="img"  style='background-image: url({{ getImageUrl(resource) }})'></div>
    </a>
  </div>
  
  <blockquote lookup context='resource' field='caption' language='language'></blockquote>
  <blockquote style='font-style:normal' lookup context='resource' field='ipr' language='language'></blockquote>
</div>
`

const template = /* html */ `
<div class="{{classes.container}}">
  <div class="{{classes.resourceItems}}" ng-show="resources.meta.totalResources > 0">
    <div ng-repeat="resource in resources.items" class="{{classes.resourceItem}}">
      ${itemTemplate}
    </div>
  </div>
  <div ng-show="resources.meta.totalResources === 0" class="{{classes.noResourcesLabel}}">
    No resources found
  </div>
  <div class="more" ng-if="resources.items.length < resources.meta.totalResources">
    <button class="btn {{classes.moreButton}}" ng-click="loadMoreResources()">load more items</button>
  </div>
</div>
`

const directive = {
  restrict: 'A',
  scope: {
    resources: '<hiResourcesPanel',
    loadResources: '=loadResources',
    params: '=loadResourcesParams',
    pinResource: '<pinResource' // XXX: this should be a "pinning" service
  },
  template,
  controller: 'ResourcesPanelCtrl',
  link: function link($scope) {
    if (isUndefined($scope.params)) $scope.params = {}
    if (isUndefined($scope.resources)) $scope.resources = []
  }
}

angular.module('histograph')
  .directive('hiResourcesPanel', () => directive)
  .controller('ResourcesPanelCtrl', controller)
