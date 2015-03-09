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
        var cont = true;
        // TODO: Something more elegant than scope.$parent ?
        if (scope.$parent.currentConcept.dirty) {
          cont = window.confirm('Endringer du har gjort på dette begrepet vil gå tapt. Vil du fortsette?');
        }
        if (!cont) return;
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