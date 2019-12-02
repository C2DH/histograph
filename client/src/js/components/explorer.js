import {
  difference, assignIn, get,
  sum, max, flatten, includes
} from 'lodash'
import { Explorer, HeatBubblePlot, BarPlot } from 'd3-explorer'
import { interpolateRdYlGn } from 'd3-scale-chromatic'
import { scaleSequential } from 'd3'
import { withStyles } from '../styles'

function getMaxValue(datum, ids) {
  return ids.reduce((maxVal, id) => max([maxVal, max(flatten(get(datum[id], 'data', [])))]), 0)
}

function getColourLinear({ val, mean, std }) {
  const linearScale = scaleSequential(interpolateRdYlGn)
    .domain([mean - std, mean + std]).clamp([])
  return linearScale(val)
}

const TypeToPlot = {
  bubble: HeatBubblePlot,
  bar: BarPlot
}

const TypeToPlotOptions = {
  bubble: {
    colourFn: getColourLinear
  },
  bar: {}
}

const TypeToUnits = {
  bubble: 2,
  bar: 1
}

const gearIconSize = '2em'
const gearIconMarginPadding = '0.2em'

const styles = {
  tooltip: {
    background: '#eeeeeebb',
    fontSize: 10,
    fontWeight: 'bold',
    border: '1px solid #ccc',
    position: 'absolute',
    zIndex: 1000,
    padding: ['0.4em', '0.6em'],
    borderRadius: 4,
    overflow: 'hidden',
    textAlign: 'center',
    lineHeight: '1.5em',
    '& span': {
      fontWeight: 'initial'
    }
  },
  controls: {
    position: 'relative',
    '& div': {
      backgroundColor: '#d6d6d63b',
      opacity: 0.3,
      position: 'absolute',
      border: 'none',
      margin: gearIconMarginPadding,
      padding: gearIconMarginPadding,
      // marginRight: '1em',
      outline: 'none',
      display: 'none',
      alignItems: 'center',
      justifyItems: 'center',
      '&:hover': {
        opacity: 1,
      },
      '& .fa': {
        width: gearIconSize,
        height: gearIconSize,
        lineHeight: gearIconSize
      }
    }
  },
  selectedGear: {
    background: '#33ff00 !important'
  }
}

/**
 * Configuration:
 * {
 *  '<plot-id>': {
 *    'label': '...',
 *    'type': '...', // one of: 'bubble', 'bar'
 *    'labels': [...] // optional
 *  }
 * }
 *
 * Data:
 * {
 *   '<plot-id>': { data: [...], labels: [...] }
 * }
 */
const directive = {
  restrict: 'A',
  scope: {
    configuration: '=hiExplorer',
    data: '=hiExplorerData',
    setBinsCount: '=hiSetBinsCount',
    onBinSelected: '=hiOnBinSelected',
    onLabelClicked: '=hiOnLabelClicked',
    stepIndex: '=hiStepIndex',
    selectedPlotId: '=hiSelectedPlotId',
    getTooltipContent: '=hiGetTooltipContent',
    onControlClicked: '=hiOnControlClicked',
    plotsIdsScaledToMax: '=hiPlotsIdsMaxScaled',
  },
  /* html */
  template: `
    <div class="{{classes.controls}}">
      <div ng-repeat="id in plotIds" class="btn btn-default {{id}} {{id === selectedPlotId ? classes.selectedGear : ''}}">
        <i class="fa fa-gear" ng-click="onControlClicked(id)"/>
      </div>
    </div>
    <div class="explorer-tooltip {{classes.tooltip}}">[tooltip-placeholder]</div>
    <div class="svg-container"></div>
  `,
  link: function link($scope, element) {
    withStyles($scope, styles)
    const root = element[0].querySelector('.svg-container')
    const tooltipElement = element[0].querySelector('.explorer-tooltip')

    function updateControlButtonsPositions() {
      if (!$scope.plotIds) return
      $scope.plotIds.forEach(id => {
        const container = element[0].querySelector('.svg-container')
        const g = container.querySelector(`.separator.${id}`)
        if (!g) return

        const c = element[0].querySelector(`.${$scope.classes.controls} .${id}`)
        if (!c) return

        const { y: containerY, x: containerX } = container.getBoundingClientRect()
        const {
          y, width: containerWidth, height: separatorHeight
        } = g.getBoundingClientRect()
        const { width: buttonWidth } = c.getBoundingClientRect()
        c.style.top = `${y - containerY + separatorHeight}px`
        c.style.left = `${containerWidth - containerX - buttonWidth / 2}px`
        c.style.display = 'flex'
        // console.log(` *** ${id}:`, c.style)
      })
    }

    $scope.explorer = new Explorer(root, {
      parameters: {
        handlers: {
          onBinSelected: (...args) => $scope.$apply($scope.onBinSelected(...args)),
          onLabelClicked: (...args) => $scope.$apply($scope.onLabelClicked(...args)),
          onBinOver: idx => $scope.$apply(() => { $scope.currentHighlightedBinIndex = idx }),
          onBinOut: () => $scope.$apply(() => { $scope.currentHighlightedBinIndex = undefined }),
          onRendered: () => setTimeout(updateControlButtonsPositions, 0)
        },
        labels: {
          offset: 100,
          margin: 5
        }
      }
    })

    if ($scope.setBinsCount) {
      // eslint-disable-next-line no-inner-declarations
      function getBinsCount() {
        setTimeout(() => {
          const bins = $scope.explorer.getMaximumOptimalBinsCount()
          if (bins < 2) return getBinsCount()
          return $scope.setBinsCount(bins)
        }, 10)
      }
      getBinsCount()
    }

    $scope.$watch('currentHighlightedBinIndex', index => {
      if (index === undefined) {
        tooltipElement.style.display = 'none'
      } else {
        const step = get([...root.querySelectorAll('.svg-container .bins .step')], index)
        if (!step) return

        const { left, width: stepWidth } = step.getBoundingClientRect()

        tooltipElement.style.display = 'block'
        tooltipElement.innerHTML = $scope.getTooltipContent(index)

        const {
          width: tooltipWidth,
        } = tooltipElement.getBoundingClientRect()

        tooltipElement.style.left = `${left - tooltipWidth / 2 + stepWidth / 2}px`

        setTimeout(() => {
          const {
            height: tooltipHeight
          } = tooltipElement.getBoundingClientRect()
          tooltipElement.style.top = `${-tooltipHeight + 20}px`
        }, 0)
      }
    })

    $scope.$watch('configuration', configuration => {
      if (!configuration) return

      const existingPlotsIds = $scope.explorer.getPlotIds()
      const newPlotsIds = Object.keys(configuration)

      const idsToRemove = difference(existingPlotsIds, newPlotsIds)
      const idsToAdd = difference(newPlotsIds, existingPlotsIds)

      idsToRemove.forEach(id => $scope.explorer.removePlot(id))

      idsToAdd.forEach(id => {
        const { label, type } = configuration[id]
        const opts = assignIn({}, TypeToPlotOptions[type], { title: label })
        const plot = new TypeToPlot[type](opts)
        $scope.explorer.addPlot(plot, { units: TypeToUnits[type], id })
      })

      newPlotsIds.forEach(id => {
        const { labels = [] } = configuration[id]
        $scope.explorer.setLabels(id, labels)
      })
      $scope.plotIds = newPlotsIds
    })

    $scope.$watch('data', datum => {
      if (!datum) return

      const maxScaledPlotsIds = get($scope, 'plotsIdsScaledToMax', [])
      const maxValue = getMaxValue(datum, maxScaledPlotsIds)

      Object.keys(datum).forEach(id => {
        const { data, labels = [] } = $scope.data[id]
        $scope.explorer.setData(id, data)
        $scope.explorer.setLabels(id, labels)
        $scope.explorer.setMaxValue(
          id,
          includes(maxScaledPlotsIds, id) ? maxValue : undefined
        )
      })
    }, true)

    $scope.$watch('plotsIdsScaledToMax', () => {
      const { data } = $scope
      if (!data) return

      const maxScaledPlotsIds = get($scope, 'plotsIdsScaledToMax', [])
      const maxValue = getMaxValue(data, maxScaledPlotsIds)

      Object.keys(data).forEach(id => {
        $scope.explorer.setMaxValue(
          id,
          includes(maxScaledPlotsIds, id) ? maxValue : undefined
        )
      })
    }, true)

    window.onresize = () => {
      $scope.explorer.render()
    }

    $scope.$watch('stepIndex', index => {
      $scope.explorer.setSelectedBin(index)
    })

    $scope.$watch('plotIds', updateControlButtonsPositions, true)
    $scope.$watch('plotIds', ids => {
      if (ids === undefined) return
      const configuration = $scope.configuration || {}

      const unitsList = ids.map(id => get(configuration, `${id}.units`, 1))

      // eslint-disable-next-line no-param-reassign
      element[0].style.height = `${sum(unitsList.map(unit => unit * 100))}px`
    }, true)

    $scope.$watch(() => $scope.explorer._getWH(), () => {
      $scope.explorer.render()
    }, true)

    // When explorables are added/removed, the size of the plot is changed.
    $scope.$watch(
      () => element[0].getBoundingClientRect().height,
      () => setTimeout(() => $scope.explorer.render(), 0)
    )
  }
}

function service($resource, HgSettings) {
  const aspectUrl = `${HgSettings.apiBaseUrl}/api/explorer/aspects/:aspectId/:resource`
  const aspectResource = $resource(aspectUrl)

  return {
    getAvailableAspects: () => aspectResource.query({}).$promise.then(v => v.map(x => x)),
    getDefaultAspects: () => aspectResource.query({ aspectId: 'default' }).$promise.then(v => v.map(x => x)),
    getAspectFilters: aspectId => aspectResource.query({ aspectId, resource: 'filters' }).$promise.then(v => v.map(x => x)),
    getAspectData: (aspectId, params) => aspectResource.get(assignIn({ aspectId, resource: 'data' }, params)).$promise.then(v => v.toJSON()),
  }
}

angular.module('histograph')
  .directive('hiExplorer', () => directive)
  .factory('ExplorerService', service)
