/**
 * HeaderController
 */
angular.module('app.controllers.header', ['app.services.auth', 'app.services.backend'])

.controller('HeaderController', ['$rootScope', '$scope', 'Auth', 'Backend', function($rootScope, $scope, Auth, Backend){
  'use strict';

  $scope.user = Auth.user;
  $scope.$on('userChanged', function(e, user) {
    $scope.user = user;
  });

  function updateUserStats() {
    Backend.getUserStats().then(function(data) {
      $scope.stats = data;
    });
  }

  updateUserStats();

  $rootScope.$on('conceptSaved', function(evt, concept) {
    updateUserStats();
  });

}]);
