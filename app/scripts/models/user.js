
// Declare app level module which depends on filters, and services
angular.module('app.services.user', ['app.services.backend'])

.factory('User', ['$q', '$rootScope', '$timeout', 'Backend', function($q, $rootScope, $timeout, Backend) {
  'use strict';

  function User(id, label) {
    var that = this;
    that.data = null;
  }

  User.prototype = {

    constructor: User,

    isLoaded: function() {
      return this.data;
    },

    setData: function(data) {
      this.data = data;
    }

  };

  User.get = function(id) {
    var deferred = $q.defer();
    Backend.getUser(id).then(function(data) {
      deferred.resolve(data.user);
    });
    return deferred.promise;
  };

  return User;

}]);
