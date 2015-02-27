
// Declare app level module which depends on filters, and services
angular.module('app.services.auth', ['ngCookies', 'app.services.backend'])

.service('Auth', ['$rootScope', '$cookieStore', function($rootScope, $cookieStore) {
  'use strict';

  console.log('User-cookie: ');
  console.log($cookieStore.get('user'));
  var currentUser = $cookieStore.get('user') || { username: '', permission: [] };

  this.user = currentUser;
  var that = this;

  this.hasPermission = function(permission) {
    if (!permission) return true;
    if (permission == 'view') return that.isLoggedIn();
    return that.user.permission[permission] ? true : false;
  };

  this.isLoggedIn = function(user) {
    if(user === undefined)
        user = that.user;
    return user.created;
  };

  this.user = currentUser;

}]);