/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * This module contains some directives involved in displaying text and enabling
 * interactions between the items and the windows with various techniques.
 */
angular.module('histograph')
  /*
    This directive display the text content from a text file via $http.get
  */
  .directive('lazytext', function ($compile, $log, $http, HgSettings) {
    return {
      restrict: 'A',
      template: '<div>url: {{url}}</div>',
      scope: {
        url: '='
      },
      link(scope, element, attrs) {
        $log.log('::lazi-text ready', scope.url);

        scope.$watch('url', function (url) {
          if (!url) return;
          element.html('loading ...');
          $http.get(`${HgSettings.apiBaseUrl}/txt/${scope.url}`).then(function (res) {
            element.html(res.data.replace(/\n/g, '<br/>'));
          });
        })
      }
    }
  })

  .directive('isolateItem', function ($compile, $log, $http) {
    return {
      restrict: 'A',
      link(scope, element, attrs) {
        scope.item = '';
      }
    };
  })

  /*
    Enable large view of item and related items.
    Use it and delete if via specific EVENTS
  */
  .directive('fullsize', function ($log) {
    return {
      restrict: 'A',
      templateUrl: 'templates/partials/resource-fullsize.html',
      scope: {},
      link(scope, elem, attrs) {
        $log.log('::fullsize enabled');
      }
    };
  })
  /*
    Basic infinite-scroll directive for ui-views.
    To be improved
  */
  .directive('infiniteScroll', function ($log) {
    return {
      scope: {
        infiniteScroll: '&',
        infiniteScrollCollection: '='
      },
      link(scope, elem, attrs) {
        $log.log('::infinite-scroll ready');

        const scrollable = angular.element(elem);
        // wrap elem with jquery.

        const distance = 0.7;
        // the distance ratio for scrollableHeight

        const throttle = 660;
        // wait for animtion to set a proper height

        let scrollableHeight;


        let timer;

        // scope vars
        scope.isBusy = false;

        // scope fn
        scope.scrolling = function (e) {
          if (scope.busy) return;

          const h = scrollable[0].scrollHeight;


          const t = scrollable.scrollTop(); const // local scrolltop. we will then add the scrollable height to get the lowest visible point.
            l = h - (scrollableHeight * distance); // the limit

          if (t + scrollableHeight > l) {
            $log.log('::infinite-scroll @scrolling', 'launch scroll');
            scope.isBusy = true;
            scope.infiniteScroll();
          }
        }


        scope.$watch('infiniteScrollCollection', function (items) {
          if (!items.length) {
            scope.isBusy = false;
            return;
          }

          $log.log('::infinite-scroll @infiniteScrollCollection, n.items:', items.length);
          scrollableHeight = scrollable.height();
          if (timer) clearTimeout(timer);
          timer = setTimeout(function () {
            scope.isBusy = false;
            scope.$apply();
          }, throttle);
        });

        // start listening on scrolling events.
        scrollable.on('scroll', scope.scrolling);
      }
    }
  })
