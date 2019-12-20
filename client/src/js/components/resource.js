import { get } from 'lodash'
import { withStyles } from '../styles'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column'
  }
}

const resourceItemTemplate = /* html */ `
  <div class="{{classes.container}} related animated fadeIn">
    <div class='actions-wrapper'>
      <div class='actions '>
        <div class="btn-group">
          <button class='btn btn-default action' uib-tooltip='{{tooltip.resource.add.to.myselection|translate}}' tooltip-append-to-body="true" ng-click='pinResource(resource.uuid, true)'>
            <i class='fa fa-thumb-tack'></i>
          </button>
        </div>
      </div>
    </div>   
    <div class="meta">
      <span class='type sans-serif' translate='resource.type.{{resource.type}}'></span> {{index + 1}} of {{totalResources}}
    </div>
    <h4>
      <a href='/r/{{resource.uuid}}'>
        <span lookup context='resource' field='title' language='language'></span>
      </a>
    </h4>

    <div class="meta">
      <span gasp-type="date" class="empty" gasp-parent="{{resource.type}}-{{resource.uuid}}" ng-if="!resource.start_date">no date found</span>
      <span class='date' ng-if="resource.start_date"> {{resource | guessInterval}}</span>
    </div>
            
    <div class='img-wrapper' ng-if='hasImage(resource)'>
      <a ng-href='/r/{{resource.uuid}}'>
        <div class="img"  style='background-image: url({{ getImageUrl(resource) }})'></div>
      </a>
    </div>

    <blockquote lookup context='resource' field='caption' language='language'></blockquote>
    <blockquote style='font-style:normal' lookup context='resource' field='ipr' language='language'></blockquote>
  </div>
`

function controller($scope, HgSettings) {
  $scope.hasImage = function (resource) {
    const isImageType = get(resource, 'mimetype') === 'image' && !!get(resource, 'url')
    const hasIiif = !!get(resource, 'iiif_url')

    return isImageType || hasIiif;
  }

  $scope.getImageUrl = function (resource) {
    const iiifUrl = get(resource, 'iiif_url')
    if (iiifUrl) {
      return iiifUrl.replace(/info.json$/, 'full/pct:20/0/default.jpg');
    }
    return `${HgSettings.apiBaseUrl}/media/${get(resource, 'url')}`;
  }
}

const directive = {
  restrict: 'E',
  template: resourceItemTemplate,
  link($scope) { withStyles($scope, styles) },
  scope: {
    resource: '=',
    totalResources: '=',
    pinResource: '&onPin',
    index: '='
  },
  controller: 'HiResourceItemCtrl'
}

angular.module('histograph')
  .directive('hiResourceItem', () => directive)
  .controller('HiResourceItemCtrl', controller)
