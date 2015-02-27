 
// Declare app level module which depends on filters, and services
angular.module('app.controllers.user', ['app.services.auth'])

.controller('UserController', ['$scope', 'user', function($scope, user) {
  'use strict';

  console.log(user);
  $scope.user = user.data.user;

}]);