
// Declare app level module which depends on filters, and services
angular.module('app.services.backend', [])

.service('Backend', ['$rootScope', '$http', function($rootScope, $http) {
  'use strict';
  // console.log('Backend init');

  this.config = {
    languages: ['nb', 'nn', 'en', 'la']
  };

  function getRequest(method, params) {
    if (!params) params = {};
    params.action = method;
    return $http({
      method: 'GET',
      url: 'backend.php',
      params: params
    });
  }

  function postRequest(method, data) {
    if (!data) data = {};
    data.action = method;
    return $http({
      method: 'POST',
      url: 'backend.php',
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

  this.getConcepts = function(filter) {
    return getRequest('get_concepts', {filter: filter});
  };

  this.getConcept = function(uri) {
    return getRequest('get_concept', {uri: uri});
  };

  this.putConcept = function(data) {
    return postRequest('put_concept', {data: data});
  };

}]);
