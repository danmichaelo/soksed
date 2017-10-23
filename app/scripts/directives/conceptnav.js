// Declare app level module which depends on filters, and services
angular.module('app.directives.conceptnav', ['app.config', 'app.services.concepts', 'app.services.state'])

.directive('conceptnav', ['$state', '$location', 'hotkeys', 'StateService', 'Concepts', 'config', function ($state, $location, hotkeys, StateService, Concepts, config) {
  'use strict';

  return {

    restrict : 'E',  // element names only
    templateUrl: 'conceptnav.html',
    replace: false,
    scope: {
      'filterobj': '='  // Two-way data binding
    },

    link: function(scope, element, attrs) {
      // console.log(element);
      // console.log(attrs);
      console.log('>>> Linking conceptnav');
      scope.filters = config.filters;
      scope.concepts = [];
      scope.busy = true;
      scope.showHelp = false;
      scope.totalCount = Concepts.count;

      hotkeys.bindTo(scope)
      .add({
        combo: '/',
        description: 'Søk',
        callback: function(event, hotkey) {
          event.preventDefault();
          $('.conceptnav input:text').focus();
        }
      });

      function conceptListUpdated() {
        console.log('conceptListUpdated');
      }

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
        // TODO: FIX! This broke with the latest Angular.
        // scope.checkScrollPos(concept);
      });

      scope.graphOptionEnabled = function() {
        return scope.filterobj.select && scope.filterobj.select.graphOption;
      };

      scope.submit = function() {
        var filterString = [];
        if (scope.filterobj.query) filterString.push(scope.filterobj.query);
        if (scope.filterobj.select) filterString.push(scope.filterobj.select.value);
        if (scope.graphOptionEnabled() && scope.filterobj.local) filterString.push('graph:local');
        console.log(filterString);

        $state.go('concepts.concept', {q: filterString.join(',')});
      };

      var q = [];
      if (scope.filterobj.query) {
        q.push(scope.filterobj.query);
      }
      if (scope.filterobj.select) {
        q.push(scope.filterobj.select.value);
      }
      if (scope.filterobj.local) {
        q.push('graph:local');
      }

      q = q.join(',');
      console.log(q);
      if (!Concepts.busy) {
        scope.busy = true;
        Concepts.fetch(q).then(function(concepts) {
          scope.concepts = concepts;
          scope.totalCount = Concepts.count;
          scope.busy = false;
          setTimeout(function() {
            scope.checkScrollPos(scope.currentConcept);
          });
        }).catch(function(err) {
          scope.concepts = [];
          scope.totalCount = 0;
          scope.error = err;
          scope.busy = false;
        });
      }
    }
  };
}]);
