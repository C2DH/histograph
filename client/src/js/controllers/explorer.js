/* eslint-env browser */
import {
  assignIn, get, isEmpty, isEqual,
  isArray
} from 'lodash'
import moment from 'moment'
import { withStyles, theme } from '../styles'

const styles = {
  explorerGraph: {
    display: 'flex',
    flex: 1,
    width: '100%',
    height: '300px',
    alignContent: 'stretch',
    '& .svg-container': {
      width: '100%'
    }
  },
  graphFooter: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  graphFooterSection: {
    display: 'flex',
  },
  explorerFilter: {
    marginRight: '2em',
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
    margin: '1em 1em 0 1em',
  }
}

function toQueryParameters(o = {}) {
  return Object.keys(o).reduce((acc, key) => {
    const value = o[key]
    // eslint-disable-next-line no-param-reassign
    acc[key] = isArray(value) ? JSON.stringify(value) : value
    return acc
  }, {})
}

angular.module('histograph')
  .controller('ExplorerCtrl', function (
    $scope, $log, $location,
    ResourceFactory,
    ExplorerService
  ) {
    withStyles($scope, styles)

    // state parameters
    $scope.params = {}

    $scope.selectedItemMeta = undefined

    $scope.selectedResources = []
    $scope.resourcesPageLimit = 10

    $scope.explorerData = {}
    $scope.explorerFiltersConfig = {}

    /* Load explorer configuration */
    ExplorerService.getConfiguration()
      .then(config => {
        $scope.explorerConfig = config

        const ids = Object.keys(config)
        ids.forEach(id => {
          ExplorerService.getAspectFilters(id)
            .then(filtersConfig => {
              $scope.explorerFiltersConfig[id] = filtersConfig
            })
            .catch(e => $log.error('Filters configuration:', _.get(e, 'data.message', 'Error getting filters configuration')))
        })
      })
      .catch(e => $log.error('Explorer configuration:', _.get(e, 'data.message', 'Error getting explorer configuration')))

    function parametersFromUrl() {
      const {
        step,
        from,
        to,
        topicId,
        filters
      } = $location.search()
      const parsedFilters = isEmpty(filters) ? undefined : JSON.parse(atob(filters))
      // const b = JSON.parse(filters || '{}')

      $scope.params = {
        step: step === undefined ? undefined : parseInt(step, 10),
        from,
        to,
        topicId,
        filters: parsedFilters
      }
    }

    const parametersToUrl = (replace = false) => {
      const { filters } = $scope.params
      const queryParams = assignIn({}, $scope.params, {
        filters: isEmpty(filters) ? undefined : btoa(JSON.stringify(filters)),
      })
      const l = $location.search(assignIn({}, $location.search(), queryParams))
      if (replace) l.replace()
    }

    $scope.$on('$locationChangeSuccess', parametersFromUrl)
    $scope.$watch('params.step', () => parametersToUrl())
    $scope.$watch('params.from', () => parametersToUrl())
    $scope.$watch('params.to', () => parametersToUrl())
    $scope.$watch('params.topicId', () => parametersToUrl())
    $scope.$watch('params.filters', () => parametersToUrl(true), true)
    parametersFromUrl()

    $scope.setBinsCount = val => {
      $scope.binsCount = val
    }

    // Pick first data object that has non-empty metadata.
    function getReferenceData() {
      return Object.keys($scope.explorerData || {}).reduce((acc, key) => {
        const data = get($scope.explorerData, key)
        if (get(data, 'meta', []).length > 0) {
          return data
        }
        return acc
      }, undefined)
    }

    $scope.zoomIn = () => {
      const data = getReferenceData()
      if (data === undefined) return

      const maxBinsToDisplay = $scope.binsCount
      const binsMeta = get(data, 'meta', [])

      const currentBinIndex = $scope.params.step !== undefined
        ? $scope.params.step : binsMeta.length / 2

      const itemsInSelectedBin = get(binsMeta, `${currentBinIndex}.totalResources`)
      if (!itemsInSelectedBin) return

      const binsCountToZoomTo = Math.floor(maxBinsToDisplay / itemsInSelectedBin) || 1

      const firstBinMetaIndex = Math.ceil(currentBinIndex - binsCountToZoomTo / 4)
      const lastBinMetaIndex = Math.floor(currentBinIndex + binsCountToZoomTo / 4)

      const firstBinMeta = get(binsMeta, firstBinMetaIndex, binsMeta[0])
      const lastBinMeta = get(binsMeta, lastBinMetaIndex, binsMeta[binsMeta.length - 1])

      if (firstBinMeta && lastBinMeta) {
        const [from, to] = [firstBinMeta.minStartDate, lastBinMeta.maxStartDate].map(v => v.replace(/T.*$/, ''))

        $location.search(angular.extend($location.search(), {
          from,
          to,
          step: undefined,
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

    $scope.onBinSelected = stepIndex => {
      $scope.itemClickHandler({ stepIndex })
    }

    $scope.itemClickHandler = ({ stepIndex }) => {
      if ($scope.params.step === stepIndex) return
      $scope.params.step = stepIndex
    }

    $scope.$watch('params.step', stepIndex => {
      const data = getReferenceData()
      if (!data) return

      const meta = get(data.meta, stepIndex)
      $log.log('Topic step selected', stepIndex, meta)
      $scope.selectedItemMeta = meta
      $scope.selectedResources = []
      $scope.totalItems = 0
    })

    const getRequiredDataForExplorerUpdate = () => ({
      bins: $scope.binsCount,
      from: get($scope.params, 'from'),
      to: get($scope.params, 'to'),
      filters: get($scope.params, 'filters', {})
    })

    function updateExplorerData(params, oldParams = {}) {
      if ($scope.explorerConfig === undefined) return
      const allPlotsIds = Object.keys($scope.explorerConfig)

      const {
        bins, from, to, filters
      } = params
      const {
        bins: oldBins, from: oldFrom, to: oldTo, filters: oldFilters
      } = oldParams

      const commonParamsAreNotUpdated = isEqual(
        [bins, from, to], [oldBins, oldFrom, oldTo]
      )

      let ids = allPlotsIds

      if (commonParamsAreNotUpdated && (!isEmpty(filters) || !isEmpty(oldFilters))) {
        ids = allPlotsIds.filter(id => !isEqual(filters[id], oldFilters[id]))
      }

      ids.forEach(id => {
        const queryParams = assignIn({ bins, from, to }, toQueryParameters(filters[id]))
        ExplorerService.getAspectData(id, queryParams)
          .then(data => {
            $scope.explorerData[id] = data
          })
          .catch(e => $log.error(`Getting data ${id}:`, _.get(e, 'data.message', 'Error getting data')))
      })
    }

    $scope.$watch(
      getRequiredDataForExplorerUpdate,
      updateExplorerData,
      true
    )

    $scope.reloadData = () => updateExplorerData(getRequiredDataForExplorerUpdate())

    $scope.$watch(getReferenceData, v => {
      $scope.itemsPerBin = get(v, 'meta.0.totalResources', 0)
      if (v !== undefined && $scope.params.step !== undefined) {
        $scope.selectedItemMeta = v.meta[$scope.params.step]
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

    $scope.topicLabelClickHandler = (plotId, topicIndex) => {
      $scope.params.topicId = topicIndex
    }
    $scope.unselectCurrentTopic = () => {
      $scope.params.topicId = undefined
    }

    $scope.onFilterValueChanged = (plotId, key, value) => {
      const filters = get($scope.params, 'filters', {})
      const plotFilters = get(filters, plotId, {})
      if (isEmpty(value)) {
        delete plotFilters[key]
      } else {
        plotFilters[key] = value
      }
      if (isEmpty(plotFilters)) {
        delete filters[plotId]
      } else {
        filters[plotId] = plotFilters
      }
      $scope.params.filters = filters
    }

    $scope.getTooltipContent = stepIndex => {
      const data = getReferenceData()
      if (!data) return ''

      const meta = get(data.meta, stepIndex)

      const [fromTime, toTime] = [meta.minStartDate, meta.maxStartDate]
        .map(v => moment.utc(v).format('DD MMM YYYY'))

      return `${meta.totalResources} <span>items</span><br/> <span>from</span> ${fromTime}<br/> <span>to</span> ${toTime}`
    }
  })
