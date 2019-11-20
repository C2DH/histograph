/* eslint-env browser */
import {
  assignIn, get, isEmpty, isEqual,
  isArray, clone, last, omitBy, isUndefined
} from 'lodash'
import moment from 'moment'
import { withStyles, theme } from '../styles'

const styles = {
  explorerGraph: {
    display: 'flex',
    flex: 1,
    width: '100%',
    height: '0px',
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
  explorableConfiguration: {
    flexGrow: 1,
    flexBasis: '25%'
  },
  mainPanel: {
    flex: '1 1 100%',
    flexGrow: 3,
    overflowY: 'scroll',
    margin: '1em 1em 0 1em',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    '& i': {
      marginRight: '0.3em'
    }
  },
  scaleToggle: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    margin: [[0, '1em']],
    '& span': {
      margin: [[0, '.3em']]
    },
    '& input': {
      margin: [[0, '.3em']]
    },
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

const EmptyResourceResponse = {
  result: {
    items: []
  },
  info: {}
}

angular.module('histograph')
  .controller('ExplorerCtrl', function (
    $scope, $log, $location,
    ResourceFactory,
    ExplorerService
  ) {
    withStyles($scope, styles)

    $scope.uid = $scope.$id

    // NOTE: a workaround to disable ruler (see filters.js). Ugly but saves from refactoring.
    $scope.rulerDisabled = true

    // state parameters
    $scope.params = {}

    $scope.selectedItemMeta = undefined

    $scope.explorerData = {}
    // $scope.explorerFiltersConfig = {}

    $scope.previousQueryParams = {}

    $scope.availableAspects = []

    $scope.maxScaledIds = []

    ExplorerService.getAvailableAspects()
      .then(aspects => {
        $scope.availableAspects = aspects
      })
      .catch(e => $log.error(e.message))

    ExplorerService.getDefaultAspects()
      .then(defaultAspects => {
        if (isEmpty($scope.params.explorables)) {
          $scope.params.explorables = defaultAspects
        }
      })
      .catch(e => $log.error(e.message))

    function parametersFromUrl() {
      const {
        step,
        from,
        to,
        topicId,
        filters,
        editPlotId,
        explorables,
        scaleKw,
      } = $location.search()
      const parsedFilters = isEmpty(filters) ? undefined : JSON.parse(atob(filters))
      const parsedExplorables = isEmpty(explorables) ? [] : explorables.split(',')
      // const b = JSON.parse(filters || '{}')

      $scope.params = {
        step: step === undefined ? undefined : parseInt(step, 10),
        from,
        to,
        topicId,
        filters: parsedFilters,
        editPlotId,
        explorables: parsedExplorables,
        scaleKeywordPlots: scaleKw
      }
    }

    const parametersToUrl = (replace = false) => {
      const { filters, explorables } = $scope.params
      const queryParams = omitBy(assignIn({}, $scope.params, {
        filters: isEmpty(filters) ? undefined : btoa(JSON.stringify(filters)),
        explorables: isEmpty(explorables) ? undefined : explorables.join(','),
        scaleKw: $scope.params.scaleKeywordPlots ? true : undefined,
        scaleKeywordPlots: undefined
      }), isUndefined)
      const l = $location.search(assignIn({}, $location.search(), queryParams))
      if (replace) l.replace()
    }

    $scope.$on('$locationChangeSuccess', parametersFromUrl)
    $scope.$watch('params.step', () => parametersToUrl())
    $scope.$watch('params.from', () => parametersToUrl())
    $scope.$watch('params.to', () => parametersToUrl())
    $scope.$watch('params.topicId', () => parametersToUrl())
    $scope.$watch('params.filters', () => parametersToUrl(true), true)
    $scope.$watch('params.editPlotId', () => parametersToUrl())
    $scope.$watch('params.explorables', () => parametersToUrl(true), true)
    $scope.$watch('params.scaleKeywordPlots', () => parametersToUrl())
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

      const binsMeta = get(data, 'meta', [])

      const currentBinIndex = $scope.params.step !== undefined
        ? $scope.params.step : binsMeta.length / 2

      const meta = get(binsMeta, currentBinIndex)

      if (meta && meta.totalResources > 1) {
        const [from, to] = [meta.minStartDate, meta.maxStartDate].map(v => v.replace(/T.*$/, ''))

        $location.search(angular.extend($location.search(), {
          from,
          to,
          step: undefined,
        }))
      }
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
    })

    const getRequiredDataForExplorerUpdate = () => ({
      bins: $scope.binsCount,
      from: get($scope.params, 'from'),
      to: get($scope.params, 'to'),
      filters: get($scope.params, 'filters', {}),
      explorerConfig: $scope.explorerConfig,
    })

    function updateExplorerData(params) {
      if ($scope.explorerConfig === undefined) return
      const allPlotsIds = Object.keys($scope.explorerConfig)

      const {
        bins, from, to, filters
      } = params

      if (!bins) return

      allPlotsIds.forEach(id => {
        const { language } = $scope
        const queryParams = assignIn({
          bins, from, to, language, method: 'count'
        }, toQueryParameters(filters[id]))
        const previousQueryParams = $scope.previousQueryParams[id]
        if (isEqual(queryParams, previousQueryParams)) return

        const { aspect } = $scope.explorerConfig[id]

        ExplorerService.getAspectData(aspect, queryParams)
          .then(data => {
            $scope.previousQueryParams[id] = queryParams
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
      if (selectedMeta === undefined) {
        $scope.resourcesSearchParams = undefined
      } else {
        $scope.resourcesSearchParams = {
          from_uuid: selectedMeta.firstResourceUuid,
          to_uuid: selectedMeta.lastResourceUuid,
          from: selectedMeta.minStartDate.replace(/T.*$/, ''),
          to: moment(clone(selectedMeta.maxEndDate)).add(1, 'days').toISOString().replace(/T.*$/, ''),
        }
      }
    }, true)

    $scope.loadResources = params => {
      if (isEqual(Object.keys(params), ['limit', 'offset'])) return Promise.resolve(EmptyResourceResponse)
      return ResourceFactory.get(params).$promise
    }

    $scope.topicLabelClickHandler = (plotId, topicIndex) => {
      $scope.params.topicId = topicIndex
    }
    $scope.unselectCurrentTopic = () => {
      $scope.params.topicId = undefined
    }

    $scope.configureExplorable = plotId => {
      $scope.params.editPlotId = plotId
    }

    $scope.finishEditingExplorableConfiguration = () => {
      $scope.params.editPlotId = undefined
    }

    $scope.getTooltipContent = stepIndex => {
      const data = getReferenceData()
      if (!data) return ''

      const meta = get(data.meta, stepIndex)

      const [fromTime, toTime] = [meta.minStartDate, meta.maxStartDate]
        .map(v => moment.utc(v).format('DD MMM YYYY'))

      return `${meta.totalResources} <span>items</span><br/> <span>from</span> ${fromTime}<br/> <span>to</span> ${toTime}`
    }

    $scope.addNewExplorable = aspect => {
      $scope.params.explorables.push(aspect.aspect)
    }

    $scope.$watch(
      () => ({
        explorables: $scope.params.explorables,
        aspects: $scope.availableAspects
      }),
      ({ explorables = [], aspects = [] }) => {
        const aspectsById = aspects.reduce((acc, item) => {
          // eslint-disable-next-line no-param-reassign
          acc[item.aspect] = item
          return acc
        }, {})

        $scope.explorerConfig = explorables.reduce((acc, id, idx) => {
          const aspectConfig = aspectsById[id]
          // eslint-disable-next-line no-param-reassign
          if (aspectConfig !== undefined) acc[`${id}-${idx}`] = aspectConfig
          return acc
        }, {})

        $scope.maxScaledIds = Object.keys($scope.explorerConfig).filter(k => k.startsWith('keywordPresenceFrequency-'))
      },
      true
    )

    $scope.removeExplorable = explorableId => {
      if (!explorableId) return
      const idx = parseInt(last(explorableId.split('-')), 10)
      $scope.params.explorables.splice(idx, 1)
      if ($scope.params.filters) {
        delete $scope.params.filters[explorableId]
      }
    }

    $scope.$watch(() => ({
      isOn: $scope.params.scaleKeywordPlots,
      ids: $scope.maxScaledIds
    }), ({ isOn, ids }) => {
      $scope.availableMaxScaledIds = isOn ? ids : []
    }, true);
  })
