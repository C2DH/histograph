/* eslint-env browser */
angular.module('histograph')
  .directive('iiifImage', function directive() {
    return {
      restrict: 'A',
      scope: {
        url: '=iiifImage'
      },
      template: '<div class="iiif-image"></div>',
      link: function link(scope, element) {
        const root = element.find('.iiif-image')[0]

        setTimeout(() => {
          const map = window.L.map(root, {
            center: [0, 0],
            crs: window.L.CRS.Simple,
            zoom: 0,
            // scrollWheelZoom: false
          })
          window.L.tileLayer.iiif(scope.url).addTo(map)
        })
      }
    }
  })
