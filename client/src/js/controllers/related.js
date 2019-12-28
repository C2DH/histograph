import { withStyles, theme } from '../styles'

angular.module('histograph')
  .controller('RelatedResourceItemsCtrl', function ($scope, $log, $stateParams, $location,
    relatedModel, relatedVizFactory, EVENTS, ResourceService) {
    withStyles($scope, {
      resourceItem: {
        display: 'flex',
        flexBasis: '33.3%',
        padding: theme.units(0.5)
      },
      relatedResourcesContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        height: '100%'
      },
      moreButton: {
        marginBottom: theme.units(4)
      }
    })
    $scope.setAvailableSortings([])

    const resourceUuid = $stateParams.id

    $scope.syncGraph = function () {
      $scope.lock('graph');
      relatedVizFactory.get(angular.extend({
        model: relatedModel,
        viz: 'graph',
        limit: 100,
        language: $scope.language
      }, $stateParams, $scope.params), function (res) {
        $scope.unlock('graph');
        if ($stateParams.ids) {
          $scope.setGraph(res.result.graph, {
            centers: $stateParams.ids
          });
        } else if ($scope.item && $scope.item.id) {
          $scope.setGraph(res.result.graph, {
            centers: [$scope.item.id]
          });
        } else $scope.setGraph(res.result.graph);
      });
    }

    const loadResources = () => {
      const filters = $location.search()
      $scope.isLoading = true
      return ResourceService
        .findRecommendedResourcesFor(resourceUuid, filters, $scope.relatedItems.length)
        .then(({ data: { recommended: { resources, info } } }) => {
          $scope.setRelatedItems($scope.relatedItems.concat(resources.map(props => ({ props }))))
          $scope.totalItems = info.total
        })
        .catch(e => $log.error(e.message))
        .finally(() => $scope.$applyAsync(() => { $scope.isLoading = false }))
    }

    $scope.sync = () => {
      $scope.setRelatedItems([])
      $scope.total = 0
      loadResources()
    };

    $scope.loadMore = loadResources

    $scope.$on(EVENTS.API_PARAMS_CHANGED, $scope.sync);
    $scope.sync()
  })
