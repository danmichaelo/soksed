 
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

          var uri;
          Object.keys(urimap).forEach(function(k) {
            var m = id.match(k);
            if (m) uri = urimap[k] + m[1];
          });
          var concept = Concepts.getByUri(uri);
          if (!concept) {
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

 
// Declare app level module which depends on filters, and services
angular.module('app.controllers.auth', ['app.services.auth'])

.controller('AuthController', ['$scope', 'Auth', 'returnTo', function($scope, Auth, returnTo) {
  'use strict';

  $scope.returnTo = window.encodeURIComponent(returnTo);

}]);
 
// Declare app level module which depends on filters, and services
angular.module('app.controllers.concept', ['app.services.backend',
                                           'app.services.auth',
                                           'app.services.state',
                                           'app.services.concepts'])

.controller('ConceptController', ['$scope', '$window', '$log', '$timeout', 'hotkeys', 'Backend',
                                  'StateService', 'Concepts', 'concept', 'view',
                                  function($scope, $window, $log, $timeout, hotkeys, Backend, 
                                           StateService, Concepts, concept, view) {
  'use strict';

  console.log('[ConceptController] Init: view=' + view + ', id=' + concept.id);
  StateService.setConcept(concept);
  StateService.setView(view);
  $scope.currentConcept = concept;

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
    keyboardModifier = 'ctrl';
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
    .add({
      combo: keyboardModifier + '+shift+s',
      description: 'Lagre',
      callback: function(event, hotkey) {
        event.preventDefault();
        $scope.store();
      },
      allowIn: ['INPUT']
    })
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
    });

}]);
 
// Declare app level module which depends on filters, and services
angular.module('app.controllers.concepts', ['app.services.backend'])

.controller('ConceptsController', ['$scope', '$state', 'Backend', 'StateService',
                                  function($scope, $state, Backend, StateService) {
  'use strict';

  $scope.selectedLanguages = Backend.config.languages;

  $scope.views = [
    {id: 1, name: 'default', label: 'Standard'},
    {id: 2, name: 'nn', label: 'Omsetjing til nynorsk'},
  ];

  function setView(view) {
    if (!view) return;
    for (var i = $scope.views.length - 1; i >= 0; i--) {
      if ($scope.views[i].name == view) {
        $scope.selectedView = $scope.views[i];
        break;
      }
    }
  }

  setView(StateService.getView());

  $scope.$on('viewChanged', function(evt, view) {
    setView(view);
  });


  $scope.$watch('selectedView', function(c, p) {
    if (!p || !c) return;
    if (p == c) return;

    $state.go('concepts.concept', { view: c.name });

    // if (c.id == 2) {
    //   $scope.selectedLanguages = ['nn', 'nb'];
    // } else {
    //   $scope.selectedLanguages = Backend.config.languages;
    // }
  });

  $scope.$on('conceptChanged', function(evt, concept) {
    console.log('[ConceptsController] Concept changed: ' + concept.uri);
    // $log.debug(concept);
    $scope.currentConcept = concept;
  });

}]);
 
// Declare app level module which depends on filters, and services
angular.module('app.controllers.user', ['app.services.auth'])

.controller('UserController', ['$scope', 'user', function($scope, user) {
  'use strict';

  console.log(user);
  $scope.user = user.data.user;

}]);
 
// Declare app level module which depends on filters, and services
angular.module('app.controllers.users', ['app.services.backend',
                                        'app.services.auth',
                                        'app.services.state',
                                        'app.services.concepts'])

.controller('UsersController', ['$scope', 'users', function($scope, users) {
  'use strict';

  console.log(users);

  $scope.users = users.data.users;

}]);
// Declare app level module which depends on filters, and services
angular.module('app.directives.altlabels', ['app.services.state'])

.directive('altlabels', ['StateService', function (StateService) {
  'use strict';

  return {

    restrict : 'E',  // element names only
    templateUrl: '/partials/altlabels.html',
    replace: false,
    scope: { items: '=', originalItems: '=', lang: '@', disabled: '@' },

    link: function(scope, element, attrs) {
      // console.log(element);
      // console.log(attrs);

      scope.keydown = function(evt) {
        // console.log(this);
        // console.log(evt);
        if (evt.keyCode === 13) { // Enter
          scope.items.push({value:''});
        }
        if (evt.keyCode === 40) {
          // Down
          var $li = $(evt.target).parent();
          var $lis = $li.parent().children('li');
          if ($lis.length <= 1) return;
          var $next = $li.next('li');
          //console.log($next);
          if ($next.length === 0) $next = $($lis[0]);
          $next.find('input').focus();
          //console.log($next.find('input').val());
        }
        if (evt.keyCode === 38) {
          // Up
        }
      };

      scope.setCurrentTerm = function(evt) {
        var $li = $(evt.target).parent();
        var idx = $li.parent().children('li').index($li);
        var term = scope.items[idx];
        StateService.setTerm(term);
      };

      scope.markReviewed = function(uri) {
        console.log('Mark reviewed: ' + uri);
        window.alert('not implemented');
      };

      function bind(lang, items) {
        // ?
      }
      /*if (attrs.disabled) {
        scope.disabled = true;
      }*/

      if (attrs.items) {
        bind(attrs.lang, attrs.items);
      } else {
        element.html('<em>No items provided</em>');
      }

    }
  };
}]);
// Declare app level module which depends on filters, and services
angular.module('app.directives.conceptnav', ['app.services.concepts', 'app.services.state'])

.directive('conceptnav', ['StateService', 'Concepts', function (StateService, Concepts) {
  'use strict';

  return {

    restrict : 'E',  // element names only
    templateUrl: '/partials/conceptnav.html',
    replace: false,
    scope: { },

    link: function(scope, element, attrs) {
      // console.log(element);
      // console.log(attrs);
      console.log('>>> Linking conceptnav');

      scope.concepts = [];
      scope.busy = true;
      scope.filterNn = '';
      scope.filterNotes = false;
      scope.totalCount = Concepts.count;

      scope.fetchMoreConcepts = function() {
        // called by infinite scroll
        console.log('FETCH MORE');
        Concepts.fetch();
      };

      scope.$on('loadedConcepts', function(evt, concepts) {
        scope.concepts = concepts;
        scope.totalCount = Concepts.count;
        scope.busy = false;
        setTimeout(function() {
          scope.checkScrollPos(scope.currentConcept);
        });
      });

      scope.selectConcept = function() {
        // console.log(this.concept);
        Concepts.show(this.concept);
      };

      scope.currentConcept = StateService.getConcept();

      scope.checkScrollPos = function(concept) {
        // All elements have the same height since we are using angular-vs-repeat
        var y = $('.scrollerwrapper').children().first().height(),
            idx = scope.concepts.indexOf(concept),
            ctop = idx * y,
            cbottom = ctop + y,
            wtop = $('.scrollerwrapper').scrollTop(),
            wbottom = wtop + $('.scrollerwrapper').height();

        if (idx === -1) return; 
        if (!concept) return; 

        if (cbottom >= wbottom) {
          $('.scrollerwrapper').scrollTop( cbottom - $('.scrollerwrapper').height() );
        } else if (ctop <= wtop) {
          $('.scrollerwrapper').scrollTop( ctop );
        }
      };

      scope.$on('conceptChanged', function(evt, concept) {
        scope.currentConcept = concept;
        scope.checkScrollPos(concept);
      });

      // scope.$watch('filter', function filterChanged(value) {
      //   console.log('Selected filter: ' + value);
      //   Concepts.fetch(value);
      // });

      scope.filter = function() {
        var q = [];
        if (scope.filterQuery) {
          q.push(scope.filterQuery);
        }
        if (scope.filterNn) {          
          q.push(scope.filterNn);
        }
        if (scope.filterNotes) {          
          q.push('has:editorialNote');
        }

        q = q.join(',');
        console.log(q);
        scope.busy = true;
        Concepts.fetch(q);
      };

      Concepts.fetch();

    }
  };
}]);
// Declare app level module which depends on filters, and services
angular.module('app.directives.term', ['app.services.state', 'app.services.backend'])

.directive('term', ['StateService', 'Backend', function (StateService, Backend) {
  'use strict';

  return {

    restrict : 'E',  // element names only
    transclude: true,
    templateUrl: '/partials/term.html',
    replace: false,
    scope: { data: '=', originalData: '=', readonly: '=' },

    link: function(scope, element, attrs) {
      // console.log(element);
      // console.log(attrs);

      scope.markReviewed = function() {        
        Backend.markReviewed(scope.originalData.uri).then(function(response) {
          // TODO: Something more elegant than scope.$parent ?
          scope.$parent.reload();  // Reload to get term URIs etc..
        });
      };

      scope.keydown = function(evt) {
        // console.log(this);
        if (evt.keyCode === 13) { // Enter
          //scope.$parent.items.push({value:''});
        }
        if (evt.keyCode === 40 || evt.keyCode === 38) {
          var $term = $(evt.target).parent();
          var $terms = $term.parent().children('term');
          var $next;

          if ($terms.length <= 1) return;
          // Down
          if (evt.keyCode == 40) {
             $next = $term.next('term');
            if ($next.length === 0) $next = $($terms[0]);
          } else {
            $next = $term.prev('term');
            if ($next.length === 0) $next = $($terms[$terms.length-1]);
          }
          $next.find('input').focus();
        }
      };

      scope.focus = function(evt) {
        StateService.setTerm(scope.data);
        $(evt.target).select();
      };

    }
  };
}]);

// Declare app level module which depends on filters, and services
angular.module('app.services.auth', ['ngCookies', 'app.services.backend'])

.service('Auth', ['$rootScope', '$cookieStore', function($rootScope, $cookieStore) {
  'use strict';

  var currentUser = $cookieStore.get('user') || { username: '', permission: [] };

  this.user = currentUser;
  var that = this;

  this.hasPermission = function(permission) {
    if (!permission) return true;
    if (permission == 'view') return that.isLoggedIn();
    return that.user.permission.indexOf(permission) != -1 ? true : false;
  };

  this.isLoggedIn = function(user) {
    if(user === undefined)
        user = that.user;
    return user.created;
  };

  this.user = currentUser;

}]);

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
      url: 'api.php',
      params: params
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

}]);


// Declare app level module which depends on filters, and services
angular.module('app.services.concept', ['app.services.backend', 'app.directives.altlabels', 'app.directives.term'])

.factory('Concept', ['$q', '$rootScope', '$timeout', 'Backend', function($q, $rootScope, $timeout, Backend) {
  'use strict';

  function Concept(id, uri, label) {
    var that = this;
    that.dirty = false;
    that.loading = false;
    that.saving = false;
    that.saved = false;
    that.error = null;
    that.id = id;
    that.uri = uri;
    that.label = label;
    that.status = 'minimal';  // 'complete', 'saving', 'saved'
    that.data = null;
  }

  Concept.prototype = {

    constructor: Concept,

    isLoaded: function() {
      return this.data;
    },

    setData: function(data) {
      // If no (editable) editorialNote field, create one
      if (!data.editorialNote) {
        data.editorialNote = [{ value: '' }];
      } else if (data.editorialNote[0].readonly) {
        data.editorialNote.push({ value: '' });        
      }

      if (!data.altLabel || !Object.keys(data.altLabel).length) data.altLabel = {};
      Backend.config.languages.forEach(function(lng) {
        // There should be at least one text field, so we add
        // one if there are none.
        if (!data.prefLabel[lng]) data.prefLabel[lng] = [{ value: '' }];
        if (!data.altLabel[lng]) data.altLabel[lng] = [{ value: '' }];
      });
      this.ensureBlankFields(data);
      this.generateHints(data);

      var oldLabel = this.label;
      this.label = data.prefLabel.nb[0].value;
      this.data = data;
      this.originalData = angular.copy(data);
      if (oldLabel != this.label) {
        $rootScope.$broadcast('conceptLabelChanged', this);
      }

      var subject = encodeURIComponent(this.label);
      this.katapiUrl = 'https://katapi.biblionaut.net/documents?q=real:' + this.label;
      var body = encodeURIComponent('\n\n\n\n--\nURI: ' + this.uri + '\nBruk: ' + this.katapiUrl);
      this.githubUrl = 'https://github.com/realfagstermer/realfagstermer/issues/new?title=' + subject + '&body=' + body;
    },

    testDirty: function() {
      this.dirty = ! angular.equals(this.data, this.originalData);
      // if (this.dirty) this.saved = false;
      this.ensureBlankFields(this.data);
    },

    generateHints: function(data) {
      var m;

      data.prefLabel.nn[0].hints = [];
      data.prefLabel.nn[0].hints.push(data.prefLabel.nb[0].value);
      m = data.prefLabel.nb[0].value.match('^(.*)er$');
      if (m) {
        data.prefLabel.nn[0].hints.push(m[1] + 'ar');
      }
      for (var i = 0; i < Math.min(data.altLabel.nn.length, data.altLabel.nb.length); i++) {
        data.altLabel.nn[i].hints = [];
        data.altLabel.nn[i].hints.push(data.altLabel.nb[i].value);
        m = data.altLabel.nb[i].value.match('^(.*)er$');
        if (m) {
          data.altLabel.nn[i].hints.push(m[1] + 'ar');
        }
      };
    },

    /**
     * Make sure there is always one blank field at the end of the term list to add new data to
     * for each language
     */
    ensureBlankFields: function(data) {
      var that = this;
      Backend.config.languages.forEach(function(lng) {

        // There should be at least one text field, so we add
        // one if there are none.
        
        if (data.altLabel[lng].length === 0 || data.altLabel[lng][data.altLabel[lng].length - 1].value !== '') {
          data.altLabel[lng].push({ value: '' });
          that.generateHints(data);
        }

        if (data.altLabel[lng].length >= 2 && data.altLabel[lng][data.altLabel[lng].length - 1].value === '' && data.altLabel[lng][data.altLabel[lng].length - 2].value === '') {
          data.altLabel[lng] = data.altLabel[lng].slice(0, data.altLabel[lng].length - 1);
        }

      });
    },

    store: function() {
      var that = this;
      that.error = '';
      that.saved = false;
      that.dirty = false;
      this.saving = true;
      Backend.putConcept(this.data).then(function(response) {
        that.saving = false;
        console.log(response);
        if (!response.data.status) {
          that.error = response.data;
          window.alert('Save failed, see concept for more info.');
          return;
        }
        if (response.data.status != 'success') {
          if (response.data.status == 'edit_conflict') {
            that.error = 'Redigeringskonflikt: Begrepet har blitt endret på serveren siden du begynte å redigere. Kopier ulagrede endringer og trykk så "Tilbakestill" (eller last siden på nytt) for å hente inn det oppdaterte begrepet.';
            window.alert('Redigeringskonflikt, endringene dine har ikke blitt lagret.');
          } else if (response.data.status == 'no_permission') {
            that.error = 'Beklager, du har ikke redigeringstilgang. Hvis du nettopp har registrert deg må du vente på at kontoen blir godkjent.';
            window.alert('Beklager, du har ikke redigeringstilgang. Hvis du nettopp har registrert deg må du vente på at kontoen blir godkjent.');
          } else {
            that.error = response.data.status;
            window.alert('Save failed, see concept for more info.');
          }
          return;
        }
        that.saved = true;
        that.load(true);  // Reload to get term URIs etc..
      }).catch(function(err) {
        that.saving = false;
        console.log(err);
        that.error = 'Invalid response received: ' + err.message;
        window.alert('Save failed!');
      });
    },

    load: function(force) {
      var that = this,
          deferred = $q.defer();

      if (this.data && !force) {
        $timeout(function() {
          deferred.resolve();
        }, 0);
      } else {
        this.loading = true;
        Backend.getConcept(this.uri).success(function(data) {
          that.loading = false;
          if (!data.concept) {
            if (data.error) {
              that.error = data.error;
            } else {
              that.error = data;
            }
            deferred.reject();
            return;
          }
          that.setData(data.concept);
          that.error = null;
          console.log('[Concept] Concept loaded: ' + data.concept.uri);
          console.log(that.data);
          $rootScope.$broadcast('conceptLoaded', that);
          deferred.resolve();
        }).error(function() {
          that.loading = false;
          that.error = 'Load failed. Server or network problems.';
          deferred.reject();
        });
      }
      return deferred.promise;
    },

    toJson: function() {
      var data = {},
          that = this;
      Object.keys(this).forEach(function(x) {
        if (x == 'originalData') return;
        data[x] = that[x];
      });
      return JSON.stringify(data);
    }

  };

  return Concept;

}]);

 
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
//    that.sort();
  });

  function fetch(filter) {
    if (busy) return;

    if (filter != currentFilter) {
      that.concepts = [];
      currentFilter = filter;
    }

    console.log('[Concepts] fetchConcepts');

    busy = true;
    Backend.getConcepts(that.cursor, filter).success(function(results) {
      busy = false;
      if (!results.concepts) {
        console.log('[Concepts] Fetch failed!');
        // TODO: Emit event?
        return;
      }
      that.count = results.count;
      if (that.count != that.concepts.length) {
        that.concepts = [];
      }
      that.cursor = results.cursor;

      results.concepts.forEach(function(concept, idx) {
        var n = that.cursor + idx;
        //that.concepts[n] = new Concept(concept.id, concept.uri, concept.label);
        if (!that.getByUri(concept.uri)) {

          if (currentConcept.uri == concept.uri) {
            that.concepts.push(currentConcept);
          } else {
            that.concepts.push(new Concept(concept.id, concept.uri, concept.label));
          }

        }
      });

      //that.sort();
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
    console.log('[Concepts] Add <' + uri + '> to the current list of ' + that.concepts.length + ' concepts.');
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
    state.view = view;
    console.log('[state] > New view');
    console.log(view);
    $rootScope.$broadcast('viewChanged', state.view);
  };

  this.getView = function() {
    return state.view;
  };

  this.setConcept = function(concept) {
    state.concept = concept;
    $rootScope.$broadcast('conceptChanged', state.concept);
  };

  this.getConcept = function() {
    return state.concept;
  };

  this.setTerm = function(term) {
    state.term = term;
    $rootScope.$broadcast('termChanged', state.term);
  };

  this.getTerm = function() {
    return state.term;
  };

}]);


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
      console.log(data);
      deferred.resolve(data);
    });
    return deferred.promise;
  };

  return User;

}]);
