 
// Declare app level module which depends on filters, and services
angular.module('app.controllers.concepts', ['app.services.backend'])

.controller('ConceptsController', ['$scope', '$state', 'Backend', 'StateService',
                                  function($scope, $state, Backend, StateService) {
  'use strict';

  var view = 'default'; // TODO: Get from ConceptController by event??

  console.log('+++ ConceptsController:init, view: ' + view);

  $scope.selectedLanguages = Backend.config.languages;

  $scope.views = [
    {id: 1, name: 'default', label: 'Standard'},
    {id: 2, name: 'nn', label: 'Nynorsk-oversettelse'},
  ];

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

    // if (c.id == 2) {
    //   $scope.selectedLanguages = ['nn', 'nb'];
    // } else {
    //   $scope.selectedLanguages = Backend.config.languages;
    // }
  });

  $scope.$on('conceptChanged', function(evt, concept) {
    console.log('[ConceptsController] Concept changed: ' + concept.uri);
    // $log.debug(concept);
    $scope.currentConcept = concept;
  });

}]);