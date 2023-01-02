 
// Declare app level module which depends on filters, and services
angular.module('app.controllers.concepts', ['app.config', 'app.services.backend'])

.controller('ConceptsController', ['$scope', '$state', '$stateParams', 'Backend', 'StateService', 'config',
                                  function($scope, $state, $stateParams, Backend, StateService, config) {
  'use strict';

  console.log('-- ConceptsController --');
  // console.log($stateParams);

  $scope.filterobj = {};
  $scope.sortobj = config.sortOptions[0];
  if ($stateParams.q) {
    $stateParams.q.split(',').forEach(function(p) {
      var filterKeys = config.filters.map(function(x) { return x.value; });
      var f = config.filters[filterKeys.indexOf(p)];
      if (f !== undefined) {
        $scope.filterobj.select = f;
      } else if (p.match('(graph:local)')) {
        $scope.filterobj.local = true;
      } else {
        $scope.filterobj.query = p;
      }
    });
  }
  if ($stateParams.sort) {
    var sortKeys = config.sortOptions.map(function(x) { return x.value; });
    var f = config.sortOptions[sortKeys.indexOf($stateParams.sort)];
    if (f !== undefined) {
      $scope.sortobj = f;
    }
  }
  if (!$scope.filterobj.select) {
    $scope.filterobj.select = config.filters[0];
  }

  $scope.selectedLanguages = config.languages;
  $scope.views = config.views;

  function setView(view) {
    if (!view) return;
    for (var i = $scope.views.length - 1; i >= 0; i--) {
      if ($scope.views[i].name == view) {
        $scope.selectedView = $scope.views[i];
        break;
      }
    }
  }

  setView(StateService.getView());

  $scope.$on('viewChanged', function(evt, view) {
    setView(view);
  });

  $scope.$watch('selectedView', function(c, p) {
    if (!p || !c) return;
    if (p == c) return;

    $state.go('concepts.concept', { view: c.name });

  });

  $scope.currentConcept = StateService.getConcept();

  $scope.$on('conceptChanged', function(evt, concept) {
    console.log('[ConceptsController] Concept changed: ');
    console.log(concept);
    $scope.currentConcept = concept;
  });

}]);