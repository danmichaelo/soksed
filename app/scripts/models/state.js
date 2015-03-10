 
// Declare app level module which depends on filters, and services
angular.module('app.services.state', ['app.services.concepts'])

.service('StateService', ['$rootScope', 'Concepts', function($rootScope, Concepts) {
  'use strict';

  var state = {
    concept: null,
    term: null,
    view: null
  };

  this.setView = function(view) {
    if (view == state.view) return;
    state.view = view;
    console.log('[state] > New view');
    console.log(view);
    $rootScope.$broadcast('viewChanged', state.view);
  };

  this.getView = function() {
    return state.view;
  };

  this.setConcept = function(concept) {
    if (state.concept == concept) return;
    state.concept = concept;
    $rootScope.$broadcast('conceptChanged', state.concept);
  };

  this.getConcept = function() {
    return state.concept;
  };

  this.setTerm = function(term) {
    if (state.term == term) return;
    state.term = term;
    $rootScope.$broadcast('termChanged', state.term);
  };

  this.getTerm = function() {
    return state.term;
  };

}]);
