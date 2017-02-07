 
// Declare app level module which depends on filters, and services
angular.module('app.controllers.events', ['app.services.backend',
                                        'app.services.auth',
                                        'app.services.state',
                                        'app.services.concepts'])

.controller('EventsController', ['$scope', 'events', function($scope, events) {
  'use strict';

  console.log(events);

  $scope.events = events.data.events;

}]);
