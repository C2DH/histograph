import { difference, assignIn, get } from 'lodash'
import { Explorer, HeatBubblePlot, BarPlot } from 'd3-explorer'
import { withStyles } from '../styles'

const TypeToPlot = {
  bubble: HeatBubblePlot,
  bar: BarPlot
}

const TypeToUnits = {
  bubble: 2,
  bar: 1
}

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
    getTooltipContent: '=hiGetTooltipContent'
  },
  /* html */
  template: `
    <div class="explorer-tooltip {{classes.tooltip}}">[tooltip-placeholder]</div>
    <div class="svg-container"></div>
  `,
  link: function link($scope, element) {
    withStyles($scope, styles)
    const root = element[0].querySelector('.svg-container')
    const tooltipElement = element[0].querySelector('.explorer-tooltip')
    $scope.explorer = new Explorer(root, {
      parameters: {
        handlers: {
          onBinSelected: (...args) => $scope.$apply($scope.onBinSelected(...args)),
          onLabelClicked: (...args) => $scope.$apply($scope.onLabelClicked(...args)),
          onBinOver: idx => $scope.$apply(() => { $scope.currentHighlightedBinIndex = idx }),
          onBinOut: () => $scope.$apply(() => { $scope.currentHighlightedBinIndex = undefined })
        },
        labels: {
          offset: 100,
          margin: 5
        }
      }
    })

    if ($scope.setBinsCount) {
      setTimeout(() => {
        $scope.setBinsCount($scope.explorer.getMaximumOptimalBinsCount())
      })
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
        const plot = new TypeToPlot[type]({ title: label })
        $scope.explorer.addPlot(plot, { units: TypeToUnits[type], id })
      })

      newPlotsIds.forEach(id => {
        const { labels = [] } = configuration[id]
        $scope.explorer.setLabels(id, labels)
      })
    })

    $scope.$watch('data', datum => {
      if (!datum) return

      Object.keys(datum).forEach(id => {
        const { data, labels = [] } = $scope.data[id]
        $scope.explorer.setData(id, data)
        $scope.explorer.setLabels(id, labels)
      })
    }, true)

    window.onresize = () => {
      $scope.explorer.render()
    }

    $scope.$watch('stepIndex', index => {
      $scope.explorer.setSelectedBin(index)
    })

    $scope.$watch(() => $scope.explorer._getWH(), () => $scope.explorer.render(), true)
  }
}

function service($resource, HgSettings) {
  const configurationUrl = `${HgSettings.apiBaseUrl}/api/explorer/configuration`
  const configurationResource = $resource(configurationUrl)

  const aspectUrl = `${HgSettings.apiBaseUrl}/api/explorer/aspects/:aspectId/:resource`
  const aspectResource = $resource(aspectUrl)

  return {
    getConfiguration: () => configurationResource.get().$promise.then(v => v.toJSON()),
    getAspectFilters: aspectId => aspectResource.query({ aspectId, resource: 'filters' }).$promise.then(v => v.map(x => x)),
    getAspectData: (aspectId, params) => aspectResource.get(assignIn({ aspectId, resource: 'data' }, params)).$promise.then(v => v.toJSON()),
  }
}

angular.module('histograph')
  .directive('hiExplorer', () => directive)
  .factory('ExplorerService', service)
