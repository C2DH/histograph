'use strict';

/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * directive to show a grapgh of nodes and edges thanks to @Yomguithereal!!! 
 */
angular.module('histograph')
  .directive('sigma', function($log, $location) {
    return {
      restrict : 'A',
      scope:{
        graph: '=',
        redirect: '&'
      },
      link : function(scope, element, attrs) {
        // Creating sigma instance
        var timeout,
            si = new sigma({
              //container: element[0],
              settings: {
                singleHover: true,
                labelThreshold: 4.9
              }
            });
            // Creating camera
        var camera = si.addCamera('main');
        
        si.addRenderer({
          camera: 'main',
          container: element[0]
        });
        
        
        /*
          Center the camera on focusId and enlighten the
          node
        */
        function focus(nodeId) {
          var node = si.graph.nodes(nodeId);
          
          sigma.misc.animation.camera(
            si.cameras.main,
            {
              x: node['read_cammain:x'],
              y: node['read_cammain:y'],
              ratio: 0.5
            },
            {duration: 150}
          );
        }

        // once the container has benn added, add the commands
        // Helper rescale functions, with easing.
        function rescale() {
          sigma.misc.animation.camera(
            si.cameras.main,
            {x: 0, y: 0, angle: 0, ratio: 1.618},
            {duration: 150}
          );
        };

        
        // check for changes
        scope.$watch('graph', function (graph, previousGraph) {
          $log.info('::sigma @graph changed');
          if(!graph || !graph.nodes)
            return;
          // stopping the timeout
          clearTimeout(timeout);

          // Killing ForceAtlas2, anyway
          si.killForceAtlas2();
          
          // calculate differences in x,y for the previous graph, if any
          if(previousGraph) {
            $log.info('::sigma --> reposition previous nodes', graph, previousGraph)
            
            var nodesMap = {};
            // map current graph
            graph.nodes.filter(function (d, i) {
              nodesMap[d.id] = i;
            });
                
            previousGraph.nodes.filter(function (d) {
              if(nodesMap[d.id]) { // was already present
                graph.nodes[nodesMap[d.id]].x = d.x;
                graph.nodes[nodesMap[d.id]].y = d.y;
              }
            }); 
          }
          $log.info('::sigma --> brand new nodes', graph.nodes.map(function(d) {
            return d.id
          }))
          
          // Reading new graph
          si.graph.clear().read(graph);
           
          var layoutDuration = Math.min(4* si.graph.nodes().length * si.graph.edges().length, 20000)
          $log.info('::sigma n. nodes', si.graph.nodes().length, ' n. edges', si.graph.edges().length, 'runninn layout atlas for', layoutDuration/1000, 'seconds')
          
          // computating other values for nodes (not only degree), min and max values
          // var stats = si.graph.HITS(true),
          //     authority = {min: -Infinity, max: Infinity};
          
          // $log.info('::sigma authority', authority)
          // local Degree for size
          si.graph.nodes().forEach(function(n) {
            // if(authority.max > 0)
            //   n.size = 1 + (stats[n.id].authority/(authority.max-authority.min))*6
            // else
              n.size = n.type == 'res'? 1 : si.graph.degree(n.id) + 1.5;
          });
          if(!previousGraph)
            rescale();
          si.refresh();
          si.startForceAtlas2({
           
          });
          $log.info('::sigma force atlas started')
          
          timeout = setTimeout(function() {
            $log.info('::sigma kill force atlas on graph')
            si.killForceAtlas2();
           
            // kill force atlas 2 according to the edge/nodes density ratio.
            // a user can always start over the graph computatyion
          }, layoutDuration );
        });
        
        // check for focus changes
        $(document).on('click', '[data-id]', function(e){
          var id = $(this).attr('data-id');
          focus(id);
        });
        
        // click on node made the resource align to the top
        si.bind('clickNode', function(e){
          $log.info('::sigma @clickNode', e.data.node.id, e.data.node.type || 'entity', e.data.node.label);
          if(e.data.node.type == 'resource') {
            $log.info('::sigma redirect to', '/r/' + e.data.node.id);
            //scope.redirect({path: '/r/' + e.data.node.id})
          }
            
        })
        
      }
    }
  });
