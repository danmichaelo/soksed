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
      });

      scope.selectConcept = function() {
        // console.log(this.concept);
        Concepts.show(this.concept);
      };

      scope.currentConcept = StateService.getConcept();

      scope.$on('conceptChanged', function(evt, concept) {
        scope.currentConcept = concept;
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