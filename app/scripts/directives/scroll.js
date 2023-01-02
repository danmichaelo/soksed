// Declare app level module which depends on filters, and services
angular.module('app.directives.scroll', [])

.directive('app-scroll', ['$parse', function ($parse) {
  'use strict';

  return {
    restrict : 'A',  // attributes
    link: function(scope, element, attrs) {
      // console.log(element);
      // console.log(attrs);

      var fn = $parse(attrs.appScroll);

	  element.bind('scroll', function(event) {
		scope.$apply(function() {
		  fn(scope, {$event: event});
		});
	  });
    }
  };
}]);
