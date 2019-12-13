import { get } from 'lodash'
import { withStyles } from '../styles'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column'
  }
}

const resourceItemTemplate = /* html */ `
  <div class="{{classes.container}} related animated fadeIn {{resource.users.length? 'with-users':''}}">
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
      <span class='type sans-serif' translate='resource.type.{{resource.props.type}}'></span> {{index + 1}} of {{totalResources}}
    </div>
    <h4>
      <a href='/r/{{resource.id}}'>
        <span lookup context='resource' field='title' language='language'></span>
      </a>
    </h4>

    <div class="meta">
      <span gasp-type="date" class="empty" gasp-parent="{{resource.type}}-{{resource.id}}" ng-if="!resource.props.start_time">no date found</span>
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
        <span ng-repeat="tag in resource.persons" ng-include='"templates/partials/entity-tag-lite.html"' ng-init='item=resource'></span>  
      </span>

    </div>
            
    <div class='img-wrapper' ng-if='hasImage(resource)'>
      <a ng-href='/r/{{resource.id}}'>
        <div class="img"  style='background-image: url({{ getImageUrl(resource) }})'></div>
      </a>
    </div>

    <blockquote lookup context='resource' field='caption' language='language'></blockquote>
    <blockquote style='font-style:normal' lookup context='resource' field='ipr' language='language'></blockquote>
  </div>
`

function controller($scope, HgSettings) {
  $scope.hasImage = function (resource) {
    const isImageType = get(resource, 'props.mimetype') === 'image' && !!get(resource, 'props.url')
    const hasIiif = !!get(resource, 'props.iiif_url')

    return isImageType || hasIiif;
  }

  $scope.getImageUrl = function (resource) {
    const iiifUrl = get(resource, 'props.iiif_url')
    if (iiifUrl) {
      return iiifUrl.replace(/info.json$/, 'full/pct:20/0/default.jpg');
    }
    return `${HgSettings.apiBaseUrl}/media/${get(resource, 'props.url')}`;
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
  controller
}

angular.module('histograph')
  .directive('hiResourceItem', () => directive)
