 
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

  $scope.categories = [
    'http://data.ub.uio.no/realfagstermer/cat_1',
    'http://data.ub.uio.no/realfagstermer/cat_2',
    'http://data.ub.uio.no/realfagstermer/cat_3',
    'http://data.ub.uio.no/realfagstermer/cat_4',
    'http://data.ub.uio.no/realfagstermer/cat_5',
    'http://data.ub.uio.no/realfagstermer/cat_6',
    'http://data.ub.uio.no/realfagstermer/cat_7',
    'http://data.ub.uio.no/realfagstermer/cat_8',
    'http://data.ub.uio.no/realfagstermer/cat_9',
  ];

  $scope.categoryLabels = {
    'http://data.ub.uio.no/realfagstermer/cat_1': 'Generelt',
    'http://data.ub.uio.no/realfagstermer/cat_2': 'Astro',
    'http://data.ub.uio.no/realfagstermer/cat_3': 'Fysikk',
    'http://data.ub.uio.no/realfagstermer/cat_4': 'Biologi',
    'http://data.ub.uio.no/realfagstermer/cat_5': 'Geo',
    'http://data.ub.uio.no/realfagstermer/cat_6': 'Farmasi',
    'http://data.ub.uio.no/realfagstermer/cat_7': 'Kjemi',
    'http://data.ub.uio.no/realfagstermer/cat_8': 'Informatikk',
    'http://data.ub.uio.no/realfagstermer/cat_9': 'Matematikk',
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
