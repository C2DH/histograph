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

function controller($scope, $stateParams, $location) {
  const { type } = $stateParams

  $scope.menuElements = MenuElements
  $scope.filterValues = { grammar: type }

  $scope.onFilterChanged = (filterType, value) => {
    if (filterType === 'grammar') $location.path(`/newsearch/${value}`)
  }
}

angular.module('histograph')
  .controller('NewSearchCtrl', controller)
