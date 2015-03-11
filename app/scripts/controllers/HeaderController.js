/**
 * HeaderController
 */
angular.module('app.controllers.header', ['app.services.auth'])

.controller('HeaderController', ['$scope', 'Auth', function($scope, Auth){
  'use strict';

  // TODO: Use Stateservice to determine?
  $scope.menuAvailable = true;

  $scope.toggleMenu = function() {
    angular.element('body').toggleClass('menuVisible');
  };

  $scope.user = Auth.user;
  $scope.$on('userChanged', function(e, user) {
    $scope.user = user;
  });

}]);
