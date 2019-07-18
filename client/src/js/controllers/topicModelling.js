/* eslint-env browser */
import { withStyles } from '../styles'

const styles = {
  graphFooter: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  zoomInButton: {
    marginRight: '1em',
    '& .fa': {
      fontSize: '1em',
    }
  },
  barZoomLabel: {
    lineHeight: '1em',
    margin: [['auto', 0]]
  }
}

angular.module('histograph')
  .controller('TopicModellingCtrl', function (
    $scope, $log, $location,
    TopicModellingAspectsService,
    TopicModellingScoresService, EVENTS,
    ResourceFactory
  ) {
    withStyles($scope, styles)

    $scope.aspectFilter = { selectedValues: [] }
    $scope.busyCounter = 0
    $scope.criteria = $location.search()

    $scope.resourcesPageLimit = 10

    $scope.$on(EVENTS.API_PARAMS_CHANGED, (e, params) => {
      const { from, to } = params
      $scope.criteria = { from, to }
    })

    $scope.addOrRemoveAspectFilterValue = value => {
      if ($scope.aspectFilter.selectedValues.indexOf(value) >= 0) {
        $scope.aspectFilter.selectedValues = $scope.aspectFilter
          .selectedValues.filter(v => v !== value)
      } else {
        $scope.aspectFilter.selectedValues.push(value)
      }
    }

    $scope.clearAspectFilter = () => {
      $scope.aspectFilter.selectedValues = []
    }

    $scope.setBinsCount = val => {
      $scope.binsCount = val
    }

    $scope.zoomIn = () => {
      const itemPerBinAtCurrentZoomLevel = _.get($scope, 'topicModellingData.aggregatesMeta.0.totalResources')
      if (!itemPerBinAtCurrentZoomLevel) return

      const binsToDisplay = $scope.binsCount
      const binsCountToZoomTo = Math.floor(binsToDisplay / itemPerBinAtCurrentZoomLevel) || 1
      const binsMeta = _.get($scope, 'topicModellingData.aggregatesMeta', [])

      const firstBinMeta = binsMeta[Math.ceil(binsMeta.length / 2 - binsCountToZoomTo / 2)]
      const lastBinMeta = binsMeta[Math.floor(binsMeta.length / 2 + binsCountToZoomTo / 2)]

      if (firstBinMeta && lastBinMeta) {
        $location.search(angular.extend($location.search(), {
          from: firstBinMeta.minStartDate.replace(/T.*$/, ''),
          to: lastBinMeta.minStartDate.replace(/T.*$/, '')
        }))
      }
    }

    $scope.loadMoreResources = () => {
      $scope.busyCounter += 1
      ResourceFactory.get({
        limit: $scope.resourcesPageLimit,
        offset: $scope.selectedResources.length,
        from_uuid: $scope.selectedItemMeta.firstResourceUuid,
        to_uuid: $scope.selectedItemMeta.lastResourceUuid,
        from: $scope.selectedItemMeta.minStartDate.replace(/T.*$/, ''),
        to: moment($scope.selectedItemMeta.maxEndDate).add(1, 'days').toISOString().replace(/T.*$/, ''),
      }).$promise
        .then(results => {
          $scope.selectedResources = $scope.selectedResources.concat(results.result.items)
          $scope.totalItems = results.info.total_items
        })
        .catch(e => {
          $log.error('Could not get resources from the API', e.message)
        })
        .finally(() => {
          $scope.busyCounter -= 1
        })
    }

    $scope.itemClickHandler = ({ stepIndex, topicIndex }) => {
      const meta = $scope.topicModellingData.aggregatesMeta[stepIndex]
      $log.info('Topic item selected', stepIndex, topicIndex, meta)
      $scope.selectedItemMeta = meta
      $scope.selectedResources = []
      $scope.totalItems = 0

      const requestParams = meta.totalResources === 1
        ? {
          id: meta.firstResourceUuid,
        }
        : {
          limit: $scope.resourcesPageLimit,
          offset: $scope.selectedResources.length,
          from_uuid: meta.firstResourceUuid,
          to_uuid: meta.lastResourceUuid,
          from: meta.minStartDate.replace(/T.*$/, ''),
          to: moment(meta.maxEndDate).add(1, 'days').toISOString().replace(/T.*$/, ''),
        }

      $scope.busyCounter += 1
      ResourceFactory
        .get(requestParams).$promise
        .then(results => {
          $log.info('Selection results', results)
          const items = results.result.items || [results.result.item]
          $scope.selectedResources = items
          $scope.totalItems = results.info.total_items || 1
        })
        .catch(e => {
          $log.error('Could not get resources from the API', e.message)
        })
        .finally(() => {
          $scope.busyCounter -= 1
        })
    }

    $scope.$watch('optionalFeatures.topicModellingTimeline', val => {
      if (!val) return

      const { aspectFilteringEnabled, aspect } = val

      if (aspectFilteringEnabled && !$scope.aspectFilter.filterKey) {
        $scope.busyCounter += 1
        TopicModellingAspectsService
          .get({ aspect, extra: 'filter-values' }).$promise
          .then(data => {
            $scope.aspectFilter = {
              selectedValues: $scope.aspectFilter.selectedValues,
              values: data.values,
              label: data.filterLabel,
              filterKey: data.filterKey,
              aspect
            }
          })
          .catch(e => $log.error(e))
          .finally(() => { $scope.busyCounter -= 1 })
      }
    })

    $scope.$watch(
      () => ({
        bins: $scope.binsCount,
        criteria: $scope.criteria,
        filterValues: $scope.aspectFilter.selectedValues,
        aspect: $scope.aspectFilter.aspect
      }),
      ({
        bins, criteria: { from, to }, filterValues, aspect
      }) => {
        if (!bins) return

        $scope.busyCounter += 1
        TopicModellingScoresService.get({ bins, from, to }).$promise
          .then(data => {
            $scope.topicModellingData = data
          })
          .catch(e => $log.error(e))
          .finally(() => { $scope.busyCounter -= 1 })

        if (aspect) {
          const params = {
            aspect, bins, from, to
          }
          if ($scope.aspectFilter.filterKey && filterValues) {
            // eslint-disable-next-line prefer-destructuring
            params[$scope.aspectFilter.filterKey] = JSON.stringify(filterValues)
          }

          $scope.busyCounter += 1
          TopicModellingAspectsService.get(params).$promise
            .then(data => { $scope.extraFrequenciesData = data })
            .catch(e => $log.error(e))
            .finally(() => { $scope.busyCounter -= 1 })
        }
      },
      true
    )

    $scope.$watch('topicModellingData.aggregatesMeta', v => {
      $scope.itemsPerBin = _.get(v, '0.totalResources', 0)
    }, true)
  })
  // eslint-disable-next-line prefer-arrow-callback
  .factory('TopicModellingAspectsService', function service($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/resource/topic-modelling/aspects/:aspect/:extra`, {}, {})
  })
  // eslint-disable-next-line prefer-arrow-callback
  .factory('TopicModellingScoresService', function service($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/resource/topic-modelling/scores`, {}, {})
  })
