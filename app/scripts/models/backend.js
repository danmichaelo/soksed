
// Declare app level module which depends on filters, and services
angular.module('app.services.backend', [])

.service('Backend', ['$rootScope', '$http', function($rootScope, $http) {
  'use strict';
  // console.log('Backend init');

  function getRequest(method, params) {
    if (!params) params = {};
    params.action = method;
    return $http({
      method: 'GET',
      url: 'api.php',
      params: params
    }).then(function(response) {
      return response.data;
    });
  }

  function postRequest(method, data) {
    if (!data) data = {};
    data.action = method;
    return $http({
      method: 'POST',
      url: 'api.php',
      data: data
    });
  }

  this.getUser = function(id) {
    var opts = {};
    if (id) opts.id = id;
    return getRequest('get_user', opts);
  };

  this.getUsers = function() {
    return getRequest('get_users');
  };

  this.getConcepts = function(cursor, filter) {
    return getRequest('get_concepts', {cursor: cursor, filter: filter});
  };

  this.getConcept = function(uri) {
    return getRequest('get_concept', {uri: uri});
  };

  this.putConcept = function(data) {
    return postRequest('put_concept', {data: data});
  };

  this.markReviewed = function(uri) {
    return postRequest('mark_reviewed', {uri: uri});
  };

  this.searchWikipedia = function(term) {
    var opts = {term: term};
    return getRequest('search_wikipedia', opts);
  };

  this.searchWikidata = function(term) {
    var opts = {term: term};
    return getRequest('search_wikidata', opts);
  };

  this.getWikipedia = function(term, lang) {
    var opts = {term: term, lang: lang};
    return getRequest('get_wikipedia', opts);
  };

  this.getWikidata = function(uri) {
    var opts = {uri: uri};
    return getRequest('get_wikidata', opts);
  };

}]);
