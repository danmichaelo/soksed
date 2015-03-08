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

        q = q.join(',');
        console.log(q);
        scope.busy = true;
        Concepts.fetch(q);
      };

      Concepts.fetch();

    }
  };
}]);