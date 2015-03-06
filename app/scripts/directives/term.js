// Declare app level module which depends on filters, and services
angular.module('app.directives.term', ['app.services.state'])

.directive('term', ['StateService', function (StateService) {
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
        // "not normally recommended" (http://stackoverflow.com/a/17900556/489916)
        scope.$parent.markReviewed(scope.originalData.uri);
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