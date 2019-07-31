/* eslint-env browser */
import { assignIn, get, isEmpty } from 'lodash'
import { withStyles, theme } from '../styles'

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
  },
  container: {
    display: 'flex',
    flexDirection: 'row',
    alignContent: 'stretch',
    alignItems: 'stretch',
    width: '100% !important',
    position: 'absolute',
    bottom: 0,
    top: 40,
  },
  containerChild: {
    flex: 1,
  },
  topicDetails: {
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: theme.colours.background.dark.primary,
    color: theme.colours.text.light.primary
  },
  mainPanel: {
    flex: '1 1 100%',
    flexGrow: 3,
    overflowY: 'scroll',
    margin: '0 1em',
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

    // state parameters
    $scope.params = {
      aspectFilters: {}
    }

    $scope.aspectFilter = {}
    $scope.busyCounter = 0
    $scope.selectedResources = []
    $scope.resourcesPageLimit = 10


    function parametersFromUrl() {
      const {
        step,
        from,
        to,
        aspectFilters,
        topicId
      } = $location.search()
      $scope.params = {
        step: step === undefined ? undefined : parseInt(step, 10),
        from,
        to,
        aspectFilters: isEmpty(aspectFilters) ? {} : JSON.parse(aspectFilters),
        topicId
      }
    }

    const parametersToUrl = (replace = false) => {
      const { aspectFilters } = $scope.params
      const queryParams = assignIn({}, $scope.params, {
        aspectFilters: isEmpty(aspectFilters) ? undefined : JSON.stringify(aspectFilters)
      })
      const l = $location.search(assignIn({}, $location.search(), queryParams))
      if (replace) l.replace()
    }

    $scope.$on('$locationChangeSuccess', parametersFromUrl)
    $scope.$watch('params.aspectFilters', () => parametersToUrl(true), true)
    $scope.$watch('params.step', () => parametersToUrl())
    $scope.$watch('params.from', () => parametersToUrl())
    $scope.$watch('params.to', () => parametersToUrl())
    $scope.$watch('params.topicId', () => parametersToUrl())
    parametersFromUrl()


    $scope.addOrRemoveAspectFilterValue = value => {
      const { aspectFilters } = $scope.params
      const { aspect } = $scope.aspectFilter

      if (aspect === undefined) return

      let values = get(aspectFilters, aspect, [])

      if (values.indexOf(value) >= 0) {
        values = values.filter(v => v !== value)
      } else {
        values.push(value)
      }
      aspectFilters[aspect] = values
    }

    $scope.clearAspectFilter = () => {
      const { aspectFilters } = $scope.params
      const { aspect } = $scope.aspectFilter

      if (aspect === undefined) return

      aspectFilters[aspect] = []
    }

    $scope.setBinsCount = val => {
      $scope.binsCount = val
    }

    $scope.zoomIn = () => {
      const itemPerBinAtCurrentZoomLevel = get($scope, 'topicModellingData.aggregatesMeta.0.totalResources')
      if (!itemPerBinAtCurrentZoomLevel) return

      const binsToDisplay = $scope.binsCount
      const binsCountToZoomTo = Math.floor(binsToDisplay / itemPerBinAtCurrentZoomLevel) || 1
      const binsMeta = get($scope, 'topicModellingData.aggregatesMeta', [])

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
      if ($scope.params.step === stepIndex) return
      const meta = $scope.topicModellingData.aggregatesMeta[stepIndex]
      $log.log('Topic item selected', stepIndex, topicIndex, meta)
      $scope.selectedItemMeta = meta
      $scope.selectedResources = []
      $scope.totalItems = 0

      $scope.params.step = stepIndex
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
        from: get($scope.params, 'from'),
        to: get($scope.params, 'to'),
        aspectFilters: get($scope.params, 'aspectFilters', {}),
        aspect: $scope.aspectFilter.aspect
      }),
      ({
        bins, from, to, aspectFilters, aspect
      }) => {
        if (!bins) return
        if (aspect === undefined) return

        const filterValues = get(aspectFilters, aspect, [])

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
      $scope.itemsPerBin = get(v, '0.totalResources', 0)
      if (v !== undefined && $scope.params.step !== undefined) {
        $scope.selectedItemMeta = v[$scope.params.step]
      }
    }, true)

    $scope.$watch('selectedItemMeta', selectedMeta => {
      if (selectedMeta === undefined) return

      const requestParams = selectedMeta.totalResources === 1
        ? {
          id: selectedMeta.firstResourceUuid,
        }
        : {
          limit: $scope.resourcesPageLimit,
          offset: $scope.selectedResources.length,
          from_uuid: selectedMeta.firstResourceUuid,
          to_uuid: selectedMeta.lastResourceUuid,
          from: selectedMeta.minStartDate.replace(/T.*$/, ''),
          to: moment(selectedMeta.maxEndDate).add(1, 'days').toISOString().replace(/T.*$/, ''),
        }

      $scope.busyCounter += 1
      ResourceFactory
        .get(requestParams).$promise
        .then(results => {
          $log.log('Selection results', results)
          const items = results.result.items || [results.result.item]
          $scope.selectedResources = items
          $scope.totalItems = get(results, 'info.total_items', 1)
        })
        .catch(e => {
          $log.error('Could not get resources from the API', e.message)
        })
        .finally(() => {
          $scope.busyCounter -= 1
        })
    }, true)

    $scope.topicLabelClickHandler = ({ topicIndex }) => {
      $scope.params.topicId = topicIndex
    }
    $scope.unselectCurrentTopic = () => {
      $scope.params.topicId = undefined
    }
  })
  // eslint-disable-next-line prefer-arrow-callback
  .factory('TopicModellingAspectsService', function service($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/resource/topic-modelling/aspects/:aspect/:extra`, {}, {})
  })
  // eslint-disable-next-line prefer-arrow-callback
  .factory('TopicModellingScoresService', function service($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/resource/topic-modelling/scores`, {}, {})
  })
