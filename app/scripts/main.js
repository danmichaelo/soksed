 
// Declare app level module which depends on filters, and services
angular.module('app', ['ngSanitize',
                       'vs-repeat',
                       'cfp.hotkeys',
                       'ui.router',

                       'app.controllers.user',
                       'app.controllers.users',
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
                       'app.directives.conceptnav'])


.config(['$stateProvider', '$urlRouterProvider', '$locationProvider', '$logProvider', 'hotkeysProvider', function($stateProvider, $urlRouterProvider, $locationProvider, $logProvider, hotkeysProvider) {
  'use strict';

  $logProvider.debugEnabled(true);
  hotkeysProvider.includeCheatSheet = true;


  var defaultView = 'nn';

  // For any unmatched url, redirect to /
  //$urlRouterProvider.otherwise('/concepts');

  var urimap = {
    '^REAL([0-9]+)$': 'http://data.ub.uio.no/realfagstermer/c'
  };

  $stateProvider
    .state('home', {
      url: '/',
      templateUrl: 'partials/home.html'
    })
    .state('concepts', {
      url: '/concepts',
      templateUrl: 'partials/concepts.html',
      needsPermission: 'edit',
      controller: 'ConceptsController'
    })
    .state('concepts.concept', {
      needsPermission: 'edit',
      url: '/:id?view',
      templateUrl: function ($stateParams) {
        return '/partials/concept.' + ($stateParams.view ? $stateParams.view : defaultView) + '.html';
      },
      controller: 'ConceptController',
      resolve: {
        // An optional map of dependencies which should be injected into the controller. 
        // If any of these dependencies are promises, the router will wait for them all
        // to be resolved or one to be rejected before the controller is instantiated.
        view: ['$stateParams', function ($stateParams) {
          var view = $stateParams.view ? $stateParams.view : defaultView ;
          return view;
        }],
        concept: ['$stateParams', 'Concepts', function ($stateParams, Concepts) {
          var id = $stateParams.id;
          // console.log('!!! FETCH concept: ' + id);

          var uri;
          Object.keys(urimap).forEach(function(k) {
            var m = id.match(k);
            if (m) uri = urimap[k] + m[1];
          });
          var concept = Concepts.getByUri(uri);
          if (!concept) {
            console.log('[main] Add concept <' + uri + '>');
            concept = Concepts.add(id, uri);
          }
          // console.log(concept);
          return concept;
          // return Concepts.get([{id: $stateParams.id}]); // Returns promise
          // return Concepts.getByUri(uri); // returns promise
        }]
      }
    })
    .state('users', {
      url: '/users',
      templateUrl: 'partials/users.html',
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
      templateUrl: 'partials/user.html',
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
      templateUrl: 'partials/auth.html',
      controller: 'AuthController',
      resolve: {
        returnTo: ['$stateParams', function($stateParams) {
          return $stateParams.returnTo;
        }]
      }
    })
    ;
    // .state('state2', {
    //   url: "/state2",
    //   templateUrl: "partials/state2.html"
    // })
    // .state('state2.list', {
    //   url: "/list",
    //   templateUrl: "partials/state2.list.html",
    //   controller: function($scope) {
    //     $scope.things = ["A", "Set", "Of", "Things"];
    //   }
    // });

  // $routeProvider
  //   .when('/', {
  //     templateUrl: 'views/concepts.html',
  //     controller : 'ConceptsController',
  //     reloadOnSearch: false,
  //     access: 'verified'
  //   })
  //   .when('/users', {
  //     templateUrl: 'views/users.html',
  //     controller : 'UsersController',
  //     access: 'verified'
  //   })
  //   .when('/auth', {
  //     templateUrl: 'views/auth.html',
  //     controller : 'AuthController',
  //     access: 'public'
  //   })
  //   .otherwise({
  //     redirectTo: '/'
  //   });

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
          $state.go('user', { id: Auth.user.username[0] });
        } else {
          $state.go('auth', { returnTo: url });
        }
      }
    });

}])

.controller('LoginCtrl', ['$scope', '$location', '$log', '$timeout', 'Auth', 'Concepts', 'StateService', function($scope, $location, $log, $timeout, Auth, Concepts, StateService){
  'use strict';

  // console.log('LoginCtrl init');

  $scope.user = Auth.user;

  $scope.$on('userChanged', function(e, user) {
    $scope.user = user;
  });


  // function stateChanged() {
  //   // var id = $location.hash();
  //   var id = $location.search().id;
  //   if (!id) return;
  //   $log.debug('[main] State changed: ' + id);

  //   var uri;
  //   Object.keys(urimap).forEach(function(k) {
  //     var m = id.match(k);
  //     if (m) uri = urimap[k] + m[1];
  //   });
  //   var concept = Concepts.getByUri(uri);
  //   if (!concept) {
  //     $log.debug('[main] Add concept <' + uri + '>');
  //     concept = Concepts.add(id, uri);
  //   }
  //   StateService.setConcept(concept);
  // }

  // $scope.$on('$stateChangeSuccess', stateChanged);
  // // $scope.$on('$routeUpdate', stateChanged);

}]);
