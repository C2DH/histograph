import { withStyles, theme } from '../styles'

const styles = {
  menu: {
    display: 'flex'
  },
  container: {
    display: 'flex',
    flexDirection: 'row',
    overflow: 'hidden',
    height: '100%',
    marginTop: theme.units(1)
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
  },
  loadMoreItemsSection: {
    display: 'flex',
    width: '100%',
    '& button': {
      width: '100%'
    },
    marginBottom: theme.units(2)
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
    offset,
    language
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
  $scope.items = []

  $scope.onFilterChanged = (filterType, value) => {
    if (filterType === 'grammar') $location.path(`/newsearch/${value}`)
  }

  const updateItems = () => getItems(
    SearchFactory, type, $scope.language, $location.search(), $scope.items.length
  ).then(({ items, total }) => {
    $scope.items = $scope.items.concat(items)
    $scope.totalItems = total
  })

  const updateItemsAndGraph = () => {
    updateItems()
    getGraph(SearchVizFactory, type, $scope.language, $location.search())
      .then(graph => { $scope.graph = graph })
  }

  $scope.$on('$locationChangeSuccess', updateItemsAndGraph)
  updateItemsAndGraph()

  $scope.loadMoreItems = () => updateItems()
}

angular.module('histograph')
  .controller('NewSearchCtrl', controller)