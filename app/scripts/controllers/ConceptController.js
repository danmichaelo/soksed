 
// Declare app level module which depends on filters, and services
angular.module('app.controllers.concept', ['app.services.backend',
                                           'app.services.auth',
                                           'app.services.state',
                                           'app.services.concepts'])

.controller('ConceptController', ['$scope', '$window', '$log', '$timeout', 'hotkeys', 'Backend',
                                  'Concepts', 'concept',
                                  function($scope, $window, $log, $timeout, hotkeys, Backend, 
                                           Concepts, concept) {
  'use strict';

  if (concept) {
    console.log('[ConceptController] Init: id=' + concept.id);
  } else {
    console.log('[ConceptController] Init: no concept');
    return;
  }
  $scope.currentConcept = concept;

  //-
  // Focus first edit field once available
  //-

  function setFocus () {
    $timeout(function() {
      var field = angular.element('.main input[type="text"]:enabled');
      if (field.length) field[0].focus();
    }, 0);
  }

  if (concept.isLoaded()) {
    setFocus();
  }
  $scope.$on('conceptLoaded', function(e, user) {
    setFocus();
  });

  //-
  // Test dirtyness on data change
  //-

  $scope.$watch('currentConcept.data', function(c, p) {
    if (!p || !c) return;
    if (p.uri != c.uri) return;
    $scope.currentConcept.testDirty();
  }, true);

  //-
  // Store
  //-

  $scope.store = function() {
    if ($scope.currentConcept.dirty) {
      $scope.currentConcept.store();
    }
  };

  $scope.storeAndGo = function() {
    $scope.store();
    Concepts.next();
  };

  $scope.reload = function() {
    $log.debug('[main] Reload concept');
    $scope.currentConcept.load(true);
  };


  //-
  // Keyboard shortcuts
  //-

  // when you bind it to the controller's scope, it will automatically unbind
  // the hotkey when the scope is destroyed (due to ng-if or something that changes the DOM)
  
  var keyboardModifier = 'alt';
  if (navigator.platform == 'MacIntel') {
    keyboardModifier = 'ctrl';
  }

  hotkeys.bindTo($scope)
    .add({
      combo: keyboardModifier + '+s',
      description: 'Lagre og hopp til neste',
      callback: function(event, hotkey) {
        event.preventDefault();
        $scope.storeAndGo();
      },
      allowIn: ['INPUT']
    })
    .add({
      combo: keyboardModifier + '+shift+s',
      description: 'Lagre',
      callback: function(event, hotkey) {
        event.preventDefault();
        $scope.store();
      },
      allowIn: ['INPUT']
    })
    .add({
      combo: keyboardModifier + '+down',
      description: 'Hopp til neste',
      callback: function(event, hotkey) {
        event.preventDefault();
        Concepts.next();
      },
      allowIn: ['INPUT']
    })
    .add({
      combo: keyboardModifier + '+up',
      description: 'Hopp til forrige',
      callback: function(event, hotkey) {
        event.preventDefault();
        Concepts.prev();
      },
      allowIn: ['INPUT']
    })
    .add({
      combo: keyboardModifier + '+k',
      description: 'Vis katalogposter',
      callback: function(event, hotkey) {
        event.preventDefault();
        window.open($scope.currentConcept.katapiUrl, 'katapi');
      },
      allowIn: ['INPUT']
    });

}]);