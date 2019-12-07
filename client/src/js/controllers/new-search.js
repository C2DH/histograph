
function controller($scope, $log, type) {
  $scope.type = type
  $scope.menuElements = [
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

  $scope.filterValues = {
    grammar: type
  }

  $scope.onFilterChanged = (filterType, value) => {
    $log.log('Filter changed', filterType, value)
  }
}

angular.module('histograph')
  .controller('NewSearchCtrl', controller)
