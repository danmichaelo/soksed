 
// Declare app level module which depends on filters, and services
angular.module('app.controllers.users', ['app.services.backend',
                                        'app.services.auth',
                                        'app.services.state',
                                        'app.services.concepts'])

.controller('UsersController', ['$scope', 'users', function($scope, users) {
  'use strict';

  console.log(users);

  $scope.users = users.data.users;

}]);