

/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * Annotator diective for images, using d3 and svg instead of canvas
 */
angular.module('histograph')
  /*
    based on https://github.com/withanage/angularjs-image-annotate/blob/master/src/imageAnnotate.js
  */
  .directive('annotorious', function () {
    return {
      restrict: 'A', // only element name in order to avoid errors
      scope: {
        src: '=',
        contribute: '&',
        item: '=',
        notes: '='
      },
      template: '<div style="position:relative; "></div>',
      link(scope, element, attrs) {
        // start everything once the loading has been done
        const img = new Image();


        const ele = d3.select(element[0]);


        let svg;


        const annotations = [];


        let mouseIsDown = false;


        const cursor = null;
        // current drawing position

        let anchor = null; // first drawing position when user mousedown

        /*
          Enable mouse listeners
        */
        function start() {
          svg.on('mousemove', function () {
            if (!mouseIsDown) return;
            const cursor = d3.mouse(this);
            annotate(cursor);
          })
            .on('mouseup', function () {
              mouseIsDown = false;
              anchor = null;
              const w = parseInt(note.attr('width'));


              const h = parseInt(note.attr('height'));

              if ((isNaN(w) || isNaN(h)) || (w < 20 || h < 20)) {
                console.log('width or height not valid')
                return
              }
              // froze annotation till the process is either submitted or discarded
              const region = translateToRegion({
                x: parseInt(note.attr('x')),
                y: parseInt(note.attr('y')),
                width: parseInt(note.attr('width')),
                height: parseInt(note.attr('height')),
              });

              scope.contribute({
                item: scope.item,
                type: 'person',
                options: {
                  query: '',
                  context: 'picture',
                  ranges: [region],
                  quote: '',
                  discard() {
                    note.attr({
                      width: 0,
                      height: 0
                    })
                  },
                  submit() {
                    note.attr({
                      width: 0,
                      height: 0
                    })
                  }
                }
              });
              scope.$apply();
            })
            .on('mousedown', function () {
              mouseIsDown = true;
            });
        }

        function resize(w, h) {
          scope.width = w;
          scope.height = h;
          scope.$apply();
          if (svg) {
            svg
              .attr('height', h)
              .attr('width', w);
          }
        }

        /*
          Draw the rectangle by following the mouse position
        */
        function annotate(mouse) {
          let mod = {};


          const cursor = {
            x: mouse[0],
            y: mouse[1]
          };
          if (!anchor) {
            anchor = cursor;
            mod = {
              x: cursor.x,
              y: cursor.y
            };
          }

          mod.width = cursor.x - anchor.x;
          mod.height = cursor.y - anchor.y;

          if (mod.width < 0) {
            mod.x = anchor.x + mod.width;
            anchor.x = mod.x;
            mod.width = -1 * mod.width;
          }
          if (mod.height < 0) {
            mod.y = anchor.y + mod.height;
            anchor.y = mod.y;
            mod.height = -1 * mod.height;
          }
          note.attr(mod)
        }

        /*
          Ops.. these functions should be replaced by d3.scale linear ;)
        */
        function translateToRegion(bounds) {
          const coeff = {
            x: scope.realWidth / scope.width,
            y: scope.realHeight / scope.height,
          };

          return {
            left: bounds.x * coeff.x,
            top: bounds.y * coeff.y,
            right: (bounds.x + bounds.width) * coeff.x,
            bottom: (bounds.y + bounds.height) * coeff.y
          }
        }

        function translateFromRegion(region) {
          const coeff = {
            x: scope.realWidth / scope.width,
            y: scope.realHeight / scope.height,
          };
          console.log('translateFromRegion', region, 'w', scope.width, scope.height)
          return {
            x: parseInt(region.left) / coeff.x,
            y: parseInt(region.top) / coeff.y,
            width: (parseInt(region.right) - parseInt(region.left)) / coeff.x,
            height: (parseInt(region.bottom) - parseInt(region.top)) / coeff.y
          }
        }

        /*
          load only babe. (eventually add)
        */
        function loadAnnotations() {
          if (!scope.notes || !scope.notes.length) return;
          console.log(scope.notes)
          // draw freely
          // scope.notes
          const selection = svg.selectAll('.note')
            .data(scope.notes.map(function (d) {
              d.bounds = translateFromRegion(d.region);
              return d;
            }), function (d, i) {
              return i
            });

          const newbies = selection.enter()
            .append('g')
            .attr('class', function (d) {
              return ['note', (d.performed_by ? 'manual' : '')].join(' ')
            })


          newbies
            .append('rect')
            .attr('class', 'note-shadow')

          newbies
            .append('rect')
            .attr('class', 'note-borders')
          // update
          selection.selectAll('.note-borders').attr({
            'stroke-width': 1,
            fill: 'rgba(255,255,255,0)',
            x(d) {
              return d.bounds.x
            },
            y(d) {
              return d.bounds.y
            },
            width(d) {
              return d.bounds.width
            },
            height(d) {
              return d.bounds.height
            }

          })
            .attr('data-id', function (d) {
              return d.id
            })
            .attr('gasp-type', 'person')
            .attr('gasp-parent', [scope.item.type, scope.item.id].join('-'))
            .attr('gasp-removable', function (d) {
              return d.removable
            })
            .attr('gasp-creator', function (d) {
              return d.performed_by ? d.performed_by.username : null
            })


          selection.selectAll('.note-shadow').attr({
            'stroke-width': 1,
            stroke: 'black',
            x(d) {
              return d.bounds.x - 1
            },
            y(d) {
              return d.bounds.y - 1
            },
            width(d) {
              return d.bounds.width + 2
            },
            height(d) {
              return d.bounds.height + 2
            }

          })
        }

        /*
          Initialize
        */

        element.append(img);

        svg = ele.append('svg')
          .attr('height', 10)
          .attr('width', 10)
          .style({
            position: 'absolute',
            left: 0,
            top: 0
          })
          .style('stroke', 'rgba(124,240,10,1)')
          .style('fill', 'none')

        // init drag behaviour
        const drag = d3.behavior.drag().on('drag', function (d, i) {
          d.x += d3.event.dx
          d.y += d3.event.dy
          d3.select(this).attr('transform', function (d, i) {
            return `translate(${[d.x, d.y]})`
          })
        });

        var note = svg.append('rect')
          .data([{
            x: 0,
            y: 0
          }])
          .attr('class', 'cursor')


        // var selection = svg.append("rect")
        //     .data([ {"x":0, "y":0} ])
        //     .attr({
        //       height: 50,
        //       width: 100,
        //       fill: 'rgba(124,240,10,0.5)'
        //     }).call(drag);

        scope.$watch('notes', function (n) {
          if (n && scope.ready) loadAnnotations();
        }, true);

        img.addEventListener('load', function (e) {
          console.log(e)
          // adapt the width to the container width
          // note that element should already have an intrinsic width
          const isLandscape = e.target.offsetWidth > e.target.offsetHeight;


          let ratio = 1.0;


          const style = {
            position: 'relative',
            margin: '0px auto'
          };


          const availableWidth = ele[0][0].offsetWidth;

          // width > height?
          if (isLandscape) {
            // will occupy the 100% of available space
            ratio = availableWidth / e.target.offsetWidth;
            $(e.target).css({
              width: availableWidth
            }); // fix width
            style.width = availableWidth
          } else {
            // will occupy just the same space in vertical
            ratio = availableWidth / e.target.offsetHeight;
            $(e.target).css({
              height: availableWidth
            });
            style.width = this.naturalWidth * ratio
          }

          // apply style to parent element
          element.css(style);

          scope.realHeight = this.naturalHeight;
          scope.realWidth = this.naturalWidth;
          scope.ready = true;
          resize(this.naturalWidth * ratio, this.naturalHeight * ratio);
          start();
          loadAnnotations();
        });
        img.addEventListener('error', this);
        img.src = attrs.prefix + scope.src;
      }
    }
  })
