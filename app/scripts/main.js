 
// Declare app level module which depends on filters, and services
angular.module('app', ['ngSanitize',
                       'vs-repeat',
                       'cfp.hotkeys',
                       'ui.router',
                       '720kb.tooltips',
                       'angucomplete-alt',
                       'templates',

                       'app.config',
                       'app.controllers.header',
                       'app.controllers.user',
                       'app.controllers.users',
                       'app.controllers.events',
                       'app.controllers.concept',
                       'app.controllers.concepts',
                       'app.controllers.auth',

                       'app.services.user',
                       'app.services.backend',
                       'app.services.auth',
                       'app.services.concepts',
                       'app.services.concept',
                       'app.services.state',

                       'app.directives.altlabels',
                       'app.directives.conceptnav',
                       'app.directives.scroll',
                       ])


.config(['$stateProvider', '$urlRouterProvider', '$locationProvider', '$logProvider', 'hotkeysProvider', function($stateProvider, $urlRouterProvider, $locationProvider, $logProvider, hotkeysProvider) {
  'use strict';

  $logProvider.debugEnabled(true);
  hotkeysProvider.includeCheatSheet = true;


  var defaultView = 'mapping';

  // For any unmatched url, redirect to /
  //$urlRouterProvider.otherwise('/concepts');

  var urimap = {
    '^REAL([0-9]+)$': 'http://data.ub.uio.no/realfagstermer/c'
  };

  $stateProvider
    .state('home', {
      url: '/',
      templateUrl: 'home.html',
    })
    .state('concepts', {
      url: '/concepts?q&sort',
      templateUrl: 'concepts.html',
      needsPermission: 'edit',
      controller: 'ConceptsController'
    })
    .state('concepts.concept', {
      needsPermission: 'edit',
      url: '/:id?view',
      templateUrl: function ($stateParams) {
        return 'concept.' + ($stateParams.view ? $stateParams.view : defaultView) + '.html';
      },
      controller: 'ConceptController',
      resolve: {
        // An optional map of dependencies which should be injected into the controller. 
        // If any of these dependencies are promises, the router will wait for them all
        // to be resolved or one to be rejected before the controller is instantiated.
        concept: ['$stateParams', 'Concepts', 'StateService', function ($stateParams, Concepts, StateService) {
          var id = $stateParams.id;

          StateService.setView($stateParams.view ? $stateParams.view : defaultView);

          var uri;
          Object.keys(urimap).forEach(function(k) {
            var m = id.match(k);
            if (m) uri = urimap[k] + m[1];
          });
          if (!uri) {
            StateService.setConcept(null);
            return;
          }

          var concept = Concepts.getByUri(uri);
          if (!concept) {
            concept = Concepts.add(id, uri);
          }
          // console.log(concept);
          StateService.setConcept(concept);
          return concept;
          // return Concepts.get([{id: $stateParams.id}]); // Returns promise
          // return Concepts.getByUri(uri); // returns promise
        }]
      }
    })
    .state('events', {
      url: '/events',
      templateUrl: 'events.html',
      controller: 'EventsController',
      needsPermission: 'edit',
      resolve: {
        events: ['$http', function($http) {
          return $http({ method: 'GET', url: 'api.php', params: {action: 'get_events'} });
        }]
      }
    })
    .state('users', {
      url: '/users',
      templateUrl: 'users.html',
      controller: 'UsersController',
      needsPermission: 'edit',
      resolve: {
        users: ['$http', function($http) {
          return $http({ method: 'GET', url: 'api.php', params: {action: 'get_users'} });
        }]
      }
    })
    .state('user', {
      url: '/users/:id',
      templateUrl: 'user.html',
      controller: 'UserController',
      needsPermission: 'view',
      resolve: {
        user: ['$stateParams', 'User', function($stateParams, User) {
          return User.get($stateParams.id);
        }]
      }
    })
    .state('auth', {
      url: '/auth?returnTo',
      templateUrl: 'auth.html',
      controller: 'AuthController',
      resolve: {
        returnTo: ['$stateParams', function($stateParams) {
          return $stateParams.returnTo;
        }]
      }
    })
    .state('forbidden', {
      url: '/forbidden',
      templateUrl: 'forbidden.html',
    }) ;

  // use the HTML5 History API
  $locationProvider.html5Mode(true);

}])

.run(['$rootScope', '$location', '$state', 'Auth', function ($rootScope, $location, $state, Auth) {
  'use strict';

    $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
      console.log('$stateChangeStart: has "' + toState.needsPermission + '" permission ? ' + (Auth.hasPermission(toState.needsPermission) ? 'yes' : 'no'));
      if (!Auth.hasPermission(toState.needsPermission)) {
        event.preventDefault();
        var url = $state.href(toState, toParams);
        if (Auth.isLoggedIn()) {
          $state.go('forbidden');
        } else {
          window.location.href = '/callback.php?login&returnTo=' + encodeURIComponent(url);
        }
      }
    });

}])

.filter('space2underscore', function () {
  return function (input) {
      return input.replace(/ /g, '_');
  };
});
