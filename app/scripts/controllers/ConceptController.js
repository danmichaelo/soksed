 
// Declare app level module which depends on filters, and services
angular.module('app.controllers.concept', ['app.services.backend',
                                           'app.services.auth',
                                           'app.services.state',
                                           'app.services.concepts'])

.controller('ConceptController', ['$scope', '$window', '$log', '$timeout', 'hotkeys', 'Backend',
                                  'StateService', 'Concepts', 'concept', 'view',
                                  function($scope, $window, $log, $timeout, hotkeys, Backend, 
                                           StateService, Concepts, concept, view) {
  'use strict';

  console.log('[ConceptController] Init: view=' + view + ', id=' + concept.id);
  StateService.setConcept(concept);
  StateService.setView(view);
  $scope.currentConcept = concept;

  // angular.element($window).bind('mousewheel', function(evt) {
  //   console.log(evt);
  //   evt.preventDefault();
  // });

 function setFocus () {
    $timeout(function() {
      // console.log(angular.element('.main input[type="text"]:enabled')[0]);
      angular.element('.main input[type="text"]:enabled')[0].focus();
    }, 0);
 }

  if (concept.isLoaded()) {
    setFocus();
  }
  $scope.$on('conceptLoaded', function(e, user) {
    setFocus();
  });

  $scope.$watch('currentConcept.data', function(c, p) {
    if (!p || !c) return;
    if (p.uri != c.uri) return;
    $scope.currentConcept.testDirty();
  }, true);

  $scope.$on('termChanged', function(evt, term) {
    $log.debug('[main] Term changed: ' + term.value);
    $scope.currentTerm = term;
  });

  $scope.nb2nn = function(value) {
    return value + 'a';
  };

  $scope.selectHint = function(hint) {
    $log.debug(hint);
    $scope.currentConcept.data.prefLabel.nn[0].value = hint;
  };

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
    });

}]);