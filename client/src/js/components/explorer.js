import { difference, assignIn } from 'lodash'
import { Explorer, HeatBubblePlot, BarPlot } from 'd3-explorer'

const TypeToPlot = {
  bubble: HeatBubblePlot,
  bar: BarPlot
}

const TypeToUnits = {
  bubble: 2,
  bar: 1
}

/**
 * Configuration:
 * {
 *  '<plot-id>': {
 *    'label': '...',
 *    'type': '...', // one of: 'bubble', 'bar'
 *    'labels': [...]
 *  }
 * }
 *
 * Data:
 * {
 *   '<plot-id>': [...]
 * }
 */
const directive = {
  restrict: 'A',
  scope: {
    configuration: '=hiExplorer',
    data: '=hiExplorerData',
    setBinsCount: '=hiSetBinsCount',
    onBinSelected: '=hiOnBinSelected',
    stepIndex: '=hiStepIndex'
  },
  template: `
    <div class="svg-container"></div>
  `,
  link: function link($scope, element) {
    const root = element[0].querySelector('.svg-container')
    $scope.explorer = new Explorer(root, {
      parameters: {
        handlers: {
          onBinSelected: (...args) => $scope.$apply($scope.onBinSelected(...args))
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
