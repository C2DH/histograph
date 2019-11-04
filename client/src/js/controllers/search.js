/**
 * @ngdoc function
 * @name histograph.controller:SearchCtrl
 * @description
 * # SearchCtrl
 */
angular.module('histograph')
  .controller('SearchCtrl', function ($scope, $log, $stateParams, stats) {
    $log.debug('SearchCtrl ready, query "', $stateParams.query, '" matches', stats);

    $scope.query = $stateParams.query

    $scope.resourcesStats = _.filter(stats.info.groups, { group: 'resource' });
    $scope.entitiesStats = _.filter(stats.info.groups, { group: 'entity' });
    /*
    	Update stats on params update?
    */
  })
