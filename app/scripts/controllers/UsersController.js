
// Declare app level module which depends on filters, and services
angular.module('app.controllers.users', ['app.services.backend',
                                        'app.services.auth',
                                        'app.services.state',
                                        'app.services.concepts'])

.controller('UsersController', ['$scope', 'users', function($scope, users) {
  'use strict';

  $scope.users = users.data.users.sort(function(a, b) {
    if (b.stats.total == a.stats.total) {
      return new Date(a.created[0]) - new Date(b.created[0]);
    }
    return b.stats.total - a.stats.total;
  });

}]);
