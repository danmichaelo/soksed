 
// Declare app level module which depends on filters, and services
angular.module('app.controllers.auth', ['app.services.auth'])

.controller('AuthController', ['$scope', 'Auth', 'returnTo', function($scope, Auth, returnTo) {
  'use strict';

  $scope.returnTo = window.encodeURIComponent(returnTo);

}]);