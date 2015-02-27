 
// Declare app level module which depends on filters, and services
angular.module('app.services.concepts', ['app.services.backend', 'app.services.concept'])

.service('Concepts', ['$rootScope', '$q', '$timeout', '$state', 'Backend', 'Concept', function($rootScope, $q, $timeout, $state, Backend, Concept) {
  'use strict';

  var busy = false;
  var that = this;
  var currentConcept = null;
  var currentFilter = null;

  this.concepts = [];
  this.cursor = 0;
  this.count = 0;

  $rootScope.$on('conceptChanged', function(evt, concept) {
    currentConcept = concept;
    if (!currentConcept.data) {
      currentConcept.load();
    }
  });

  $rootScope.$on('conceptLabelChanged', function(evt, concept) {
    console.log('Label changed, re-sort list');
    that.sort();
  });

  function fetch(filter) {
    if (busy) return;

    if (filter != currentFilter) {
      that.concepts = [];
      currentFilter = filter;
    }

    console.log('[Concepts] fetchConcepts');

    busy = true;
    Backend.getConcepts(filter).success(function(results) {
      busy = false;
      if (!results.concepts) {
        console.log('[Concepts] Fetch failed!');
        // TODO: Emit event?
        return;
      }
      that.count = results.count;
      that.cursor = results.cursor;

      results.concepts.forEach(function(concept) {
        if (!that.getByUri(concept.uri)) {
          that.concepts.push(new Concept(concept.id, concept.uri, concept.label));
        }
      });

      that.sort();
      console.log('[Concepts] Fetched');
      $rootScope.$broadcast('loadedConcepts', that.concepts);
    });
  }

  this.getConcepts = function() {
    return that.concepts;
  };

  this.fetch = function(filter) {
    fetch(filter);
  };

  this.getById = function(id) {
    return that.concepts.reduce(function(p, c) {
      if (c.id == id) return c; else return p;
    }, null);
  };

  this.getByUri = function(uri) {
    return that.concepts.reduce(function(p, c) {
      if (c.uri == uri) return c; else return p;
    }, null);
  };

  this.sort = function() {
    // console.log('[Concepts] Sort');
    that.concepts.sort(function(a,b) {
      return a.label.localeCompare(b.label);
    });
  };

  this.add = function(id, uri) {
    var concept = new Concept(id, uri, '(...)');
    that.concepts.push(concept);
    return concept;
  };

  this.show = function(concept) {
    $state.go('concepts.concept', { id: concept.id });
  };

  this.next = function() {
    var currentConceptIdx = that.concepts.indexOf(currentConcept);
    var n = currentConceptIdx + 1;
    if (n > that.concepts.length - 1) n = 0;
    that.show(that.concepts[n]);
  };

  this.prev = function() {
    var currentConceptIdx = that.concepts.indexOf(currentConcept);
    var n = currentConceptIdx - 1;
    if (n < 0) n = that.concepts.length - 1;
    that.show(that.concepts[n]);
  };


}]);
