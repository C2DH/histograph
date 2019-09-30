function controller($scope) {
  $scope.loggingIn = true;
}

angular.module('histograph').factory('LoginCallbackCtrl', controller)
