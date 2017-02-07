 
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

  // TODO: Get from http://localhost:8002/api.php?action=get_categories
  $scope.categories = [
    'http://data.ub.uio.no/entity/4d8d8554-b5f9-43be-a21e-46d058a3ee1c',
    'http://data.ub.uio.no/entity/d5a885cd-56a0-4501-9c99-418db3fbcbdb',
    'http://data.ub.uio.no/entity/c331c5e9-726c-4c55-9341-72d3e7874d6b',
    'http://data.ub.uio.no/entity/8dce39ea-409f-4072-b25b-377a69bca0a3',
    'http://data.ub.uio.no/entity/e31b973e-b1b4-4768-9d47-4151aa54fefd',
    'http://data.ub.uio.no/entity/37f033b8-c77e-4fef-bdef-273f9065265d',
    'http://data.ub.uio.no/entity/4d8d7781-2753-4d38-9ef9-de6c8cea4107',
    'http://data.ub.uio.no/entity/c0f08a3c-12ed-410a-b810-d8be5c48571b',
    'http://data.ub.uio.no/entity/aa780674-ac5f-40b2-a5a6-7912901f6d5f',
  ];

  $scope.categoryLabels = {
    'http://data.ub.uio.no/entity/4d8d8554-b5f9-43be-a21e-46d058a3ee1c': 'Generelt',
    'http://data.ub.uio.no/entity/d5a885cd-56a0-4501-9c99-418db3fbcbdb': 'Astro',
    'http://data.ub.uio.no/entity/c331c5e9-726c-4c55-9341-72d3e7874d6b': 'Fysikk',
    'http://data.ub.uio.no/entity/8dce39ea-409f-4072-b25b-377a69bca0a3': 'Biologi',
    'http://data.ub.uio.no/entity/e31b973e-b1b4-4768-9d47-4151aa54fefd': 'Geo',
    'http://data.ub.uio.no/entity/37f033b8-c77e-4fef-bdef-273f9065265d': 'Farmasi',
    'http://data.ub.uio.no/entity/4d8d7781-2753-4d38-9ef9-de6c8cea4107': 'Kjemi',
    'http://data.ub.uio.no/entity/c0f08a3c-12ed-410a-b810-d8be5c48571b': 'Informatikk',
    'http://data.ub.uio.no/entity/aa780674-ac5f-40b2-a5a6-7912901f6d5f': 'Matematikk',
  };

  // 'fa': None,
  // 'ns': None,  # Fellesbibl.
  // 'nq': None,  # Tøyen

  /*
  baMap = {
        'ns': 'Generelt',
        'na': 'Astro',
        'nf': 'Fysikk',
        'nb': 'Biologi',
        'nc': 'Geo',
        'ne': 'Farmasi',
        'nk': 'Kjemi',
        'ni': 'Informatikk',
        'nm': 'Matematikk',
        'ngh': 'Geo',
        'fa': None,
        'ns': None,  # Fellesbibl.
        'nq': None,  # Tøyen
    }*/

  $scope.selectWikipediaResult = function(q) {
    if (q) {
      console.log(q);
      $scope.currentConcept.loadCandidate(q.title, true, q.originalObject.lang);
    }
  };

  $scope.isRecommended = function(uri) {
    return $scope.currentConcept && $scope.currentConcept.recommended && ~$scope.currentConcept.recommended.indexOf(uri);
  };

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
    keyboardModifier = 'shift+alt';
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
    // .add({
    //   combo: keyboardModifier + '+s',
    //   description: 'Lagre',
    //   callback: function(event, hotkey) {
    //     event.preventDefault();
    //     $scope.store();
    //   },
    //   allowIn: ['INPUT']
    // })
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
