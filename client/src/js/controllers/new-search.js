import { withStyles, theme } from '../styles'

const styles = {
  menu: {
    display: 'flex'
  },
  container: {
    display: 'flex',
    flexDirection: 'row',
    overflow: 'hidden',
    height: '100%'
  },
  itemsPanel: {
    display: 'flex',
    flexDirection: 'column',
    flexBasis: '40%',
    overflowY: 'auto',
    padding: [[0, theme.units(1)]]
  },
  graphPanel: {
    display: 'flex',
    flexDirection: 'column',
    flexBasis: '60%'
  },
  graph: {
    position: 'relative',
    top: 0,
    width: '100%',
    display: 'flex',
    height: '100%'
  }
}

const MenuElements = [
  { type: 'search' },
  {
    type: 'grammar',
    prefix: 'in',
    choices: [
      { label: 'documents', value: 'resource' },
      { label: 'entities', value: 'entity' }
    ]
  },
  { type: 'related-to' },
  { type: 'from' },
  { type: 'to' },
]

const parseResourceItems = response => ({
  items: response.result.items,
  total: response.info.total_items
})

const parseEntityItems = response => ({
  items: response.result.items.map(i => Object.assign(i.props, { type: i.type, mentions: null })),
  total: response.info.total_items
})

function getItems(SearchFactory, type, language, params, offset = 0) {
  const parse = type === 'entity' ? parseEntityItems : parseResourceItems
  return SearchFactory.get(Object.assign({}, params, {
    model: type,
    limit: 10,
    offset
  })).$promise.then(parse)
}

function getGraph(SearchVizFactory, type, language, params) {
  return SearchVizFactory.get(Object.assign({}, params, {
    model: type,
    viz: 'graph',
    limit: 100,
    language
  })).$promise.then(res => res.result.graph)
}

function controller($scope, $stateParams, $location, SearchFactory, SearchVizFactory) {
  withStyles($scope, styles)

  const { type } = $stateParams

  $scope.menuElements = MenuElements
  $scope.filterValues = { grammar: type }

  $scope.onFilterChanged = (filterType, value) => {
    if (filterType === 'grammar') $location.path(`/newsearch/${value}`)
  }

  const updateItemsAndGraph = () => {
    getItems(SearchFactory, type, $scope.language, $location.search())
      .then(({ items, total }) => {
        $scope.items = items
        $scope.totalItems = total
      })
    getGraph(SearchVizFactory, type, $scope.language, $location.search())
      .then(graph => { $scope.graph = graph })
  }

  $scope.$on('$locationChangeSuccess', updateItemsAndGraph)
  updateItemsAndGraph()
}

angular.module('histograph')
  .controller('NewSearchCtrl', controller)
