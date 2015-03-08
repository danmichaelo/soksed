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