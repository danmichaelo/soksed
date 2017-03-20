
// Declare app level module which depends on filters, and services
angular.module('app.controllers.user', ['app.services.auth'])

.controller('UserController', ['$scope', 'user', function($scope, user) {
  'use strict';

  for (var i = user.activity.length - 1; i >= 0; i--) {
    user.activity[i].date = user.activity[i].date.split('T')[0];
  }
  $scope.user = user;

}]);
