import {
  assignIn, omit, isEmpty,
  omitBy, isUndefined
} from 'lodash'

import {
  bindStateChangeToObject,
  serializeStringList,
  deserializeStringList
} from '../utils'

/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  /*
    wall of issues
    ---
  */
  .controller('ExploreIssuesCtrl', function ($scope, $log, IssueFactory, EVENTS) {
    $log.debug('ExploreIssuesCtrl ready', $scope.params);
    $scope.limit = 20;
    $scope.offset = 0;

    $scope.sync = function () {
      $scope.loading = true;
      IssueFactory.get(angular.extend({
        limit: $scope.limit,
        offset: $scope.offset
      }, $scope.params), function (res) {
        $scope.loading = false;
        $scope.offset = res.info.offset;
        $scope.limit = res.info.limit;
        $scope.totalItems = res.info.total_items;
        if ($scope.offset > 0) $scope.addRelatedItems(res.result.items);
        else $scope.setRelatedItems(res.result.items);
      })
    };
    $scope.sync();
  })

  /*
    wall of noise
    ---
  */
  .controller('ExploreNoiseCtrl', function ($scope, $log, UserFactory, EVENTS) {
    $log.debug('ExploreNoiseCtrl ready', $scope.params);
    $scope.limit = 20;
    $scope.offset = 0;

    $scope.sync = function () {
      $scope.loading = true;
      UserFactory.get(angular.extend({
        method: 'noise',
        limit: $scope.limit,
        offset: $scope.offset
      }, $scope.params), function (res) {
        $scope.loading = false;
        $scope.offset = res.info.offset;
        $scope.limit = res.info.limit;
        $scope.totalItems = res.info.total_items;
        if ($scope.offset > 0) $scope.addRelatedItems(res.result.items);
        else $scope.setRelatedItems(res.result.items);
      })
    };

    $scope.$on(EVENTS.API_PARAMS_CHANGED, function () {
      $scope.offset = 0;
      $log.debug('ExploreNoiseCtrl @API_PARAMS_CHANGED', $scope.params);
      $scope.sync();
      // $scope.syncGraph();
    });

    $scope.$on(EVENTS.INFINITE_SCROLL, function (e) {
      $scope.offset += $scope.limit;
      $log.debug('ExploreCtrl @INFINITE_SCROLL', '- skip:', $scope.offset, '- limit:', $scope.limit);
      $scope.sync();
    });

    $scope.sync();
  })

  /* wall of resources */
  .controller('ExploreResourcesCtrl', function ($scope, $location, ResourceFactory) {
    $scope.limit = 20

    bindStateChangeToObject($scope, $location, 'resourcesSearchParams', [
      'from',
      'to',
      ['type', 'type', undefined, serializeStringList, deserializeStringList],
      ['with', 'with', undefined, serializeStringList, deserializeStringList],
      ['keywords', 'keywords', undefined, serializeStringList, deserializeStringList],
      ['orderby', 'orderby', 'topic-modelling-score'],
    ])

    $scope.loadResources = params => ResourceFactory
      .get(assignIn({}, params, { limit: $scope.limit })).$promise

    // Only trigger timeline context update when there are context related parameters present
    $scope.$watch('resourcesSearchParams', params => {
      $scope.timelineContextParams = omitBy(omit(params, ['from', 'to', 'orderby']), isUndefined)
    }, true)

    $scope.$watch('timelineContextParams', $scope.syncTimeline, true)
  })
