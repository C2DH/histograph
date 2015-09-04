/**
 * @ngdoc function
 * @name histograph.controller:CoreCtrl
 * @description
 * # CoreCtrl
 * Main controller, handle socket/io bridging for notification
 * It is the parent of the other controllers. Note: It contains also partial controllers for modals.
 */
angular.module('histograph')
  
  .controller('CoreCtrl', function ($scope, $rootScope, $location, $state, $timeout, $route, $log, $timeout, $http, $routeParams, $modal, socket, ResourceCommentsFactory, ResourceRelatedFactory, SuggestFactory, cleanService, VisualizationFactory, localStorageService, EVENTS, VIZ, MESSAGES) {
    $log.debug('CoreCtrl ready');
    $scope.locationPath = $location.path(); 
    
    var suggestionTimeout = 0;
    
    $scope.params = {}; //  this would contain limit, offset, from, to and other API params. Cfr. EVENT.API_PARAMS_CHANGED
    
    // the paths followed by a single user
    $scope.trails = [];
    
    // the global timeline of resource presence.
    $scope.timeline;
    
    // playlist of nodes ... :D
    $scope.playlist = [];
    
    // playlist ids
    $scope.playlistIds = [];
    
    // the current user
    $scope.user = {};
    
    
    // current headers for a given column. Cfr setHeader
    $scope.headers = {
      seealso: '',
      graph: ''
    };
    
    $scope.setHeader = function(key, value) {
      if(typeof key == 'object') {
        for(var i in key)
          $scope.headers[i] = key[i];
      } else
        $scope.headers[key] = value;
    }
    
    // the current search query, if any
    // $scope.query =  $routeParams.query || '';
    
    // set query and redirect to search controller
    $scope.setQuery = function(item) {
      $scope.freeze = 'sigma';
      $log.log('CoreCtrl > setQuery',  arguments);
      if(typeof item == 'string')
        location ='/#/search/' + $scope.query;
      else if(item.type == 'resource')
        $location.path('r/' + item.id);
      else if(item.type == 'person')
        $location.path('e/' + item.id);
      else
        $location.path('search/' + $scope.query);
    }
    
    /*
      Handle smart related items, with pagination. dispatch event USE_PAGE
      Please cehck that each controller clean or replace this list
    */
    $scope.relatedItems = [];
    
    $scope.setRelatedItems = function(relatedItems) {
      if(!relatedItems)
        return
      $log.log('CoreCtrl > setRelatedItems', relatedItems.length);
      $scope.relatedItems = relatedItems;
    };
    
    
    $scope.relatedPage = 1;
    $scope.relatedCount = 0; // total number of items
    $scope.setRelatedPagination = function(options) {
      $log.log('CoreCtrl > setRelatedPagination', options)
      $scope.relatedCount = options.total_count;
    }
    
    $scope.setPage = function(page, prefix) {
      $log.log('CoreCtrl > setPage', page, '- prefix:', prefix || 'without prefix');
      $scope.$broadcast(EVENTS.PAGE_CHANGED, {
        page: page,
        prefix: prefix
      });
    }
    
    /*
      language handlers
      Please cehck that each controller clean or replace this list
    */
    $scope.language = 'en';
    
    $scope.availableLanguages = [
      'en', 'fr', 'de'
    ];
    
    $scope.setLanguage = function(lang) {
      $scope.language = lang
    }
    
    /**
     handle redirection from directive
     */
    $scope.redirect = function(path) {
      $log.info('CoreCtrl redirect to', path)
      $location.path(path);
      $scope.$apply();
    };
    /*
      Will automatically update the graph view
      according tho the nodes edges propsed here.
      @param graph    - a collection of nodes and edges given as lists
      
    */
    $scope.setGraph = function(graph) {
      $log.info('CoreCtrl -> setGraph', graph.nodes.length, 'nodes', graph.edges.length, 'edges')
      $scope.graph = graph;
    };
    
    $scope.suggest = function(query) {
      // $log.info('CoreCtrl -> suggest', query);
      $scope.query = ''+ query
      $scope.freeze = 'sigma'
      return $http.get('/api/suggest', {
        params: {
          query: query
        }
      }).then(function(response){
        //console.log(response)
        return [{type:'default'}].concat(response.data.result.items)
      });
    };
    
    /*
      Open entity contextual menu
      ---------------------------
      
    */
    $scope.target;
    /*
      Open the contextual menu for something.
      
      @param e        - passed with $event, allow to repoisition the pop object
      @param item     - the item which contain the tag or the label.
      @param tag      - the entity instance for precise commenting purposes.
      @param hashtag  - istead of using target, a hashtag
    */
    $scope.toggleMenu = function(e, item, tag, hashtag) {
      $log.info('CoreCtrl -> toggleMenu()', e, item, tag)
      $scope.target = {
        event: e,
        item: item,
        tag: tag,
        hashtag: hashtag
      };
    };
    
    /*
      Commenting, everywhere
      ----------------------
    */
    $scope.commenting = false; // on commenting = true
    $scope.commented = {};
    
    $scope.comment = {
      text: "Write something please. Then do not forget to push the button below",
      tags: ''
    }
    
    // label should be in place if tag is an angular object.
    $scope.startCommenting = function(item, tag, label){
      $scope.commenting = true;
      $scope.commented = item;
      if(tag){
        if(typeof tag == 'string') {
          $scope.comment.tags = ['#' + tag];
          $scope.comment.text = '#' + tag;
        } else {
          $scope.comment.tags = ['#' + label + '-' + tag.id]
          $scope.comment.text = '#' + label + '-' + tag.id;
        }
      } else {
        $scope.comment.text = "something";
      }
      $log.info('ResourceCtrl -> startCommenting()');
      
      socket.emit('start:commenting', item.props, function (result) {
        
      });
    };
    
    $scope.postComment = function () {
      $log.debug('resource.postMention', $scope.commented);
      if($scope.comment.text.trim().length > 0 && $scope.commenting) {
        $scope.commenting = false;
        ResourceCommentsFactory.save({id: $scope.commented.id}, {
          content: $scope.comment.text,
          tags:  $scope.comment.tags
        }, function(res){
          
          console.log('postMention', res);
        })
      }
    };
    
    $scope.stopCommenting = function(item, tag, label){
        $scope.commenting = false;
        $scope.comment.tags = [];
        $scope.comment.text = ""
    };
    
    
    
    /*
    
      Following the trail
      -------------------
     */
    var Trail = function(path, start, index, level) {
      this.paths = [{
        path:  path,
        start: start
      }];
      this.index = index || 0;
      this.level = level || 0;
      this.start = start;
    };
    
    
    /*
    
      The messenger
      -------------
    */
    $scope.message = '';
    $scope.messaging = false;
    var _messengerTimer;
    $scope.setMessage = function(message, timeout) {
      timeout = timeout || 5000;
      $scope.message = message;
      $scope.messaging = true;
      clearTimeout(_messengerTimer)
      _messengerTimer = setTimeout(function() {
        $scope.messaging = false;
        $scope.$apply();
      }, timeout)
    };
    
    $scope.unsetMessage = function(message) {
      if(message == $scope.message || !message) {
        clearTimeout(_messengerTimer);
        _messengerTimer = setTimeout(function() {
          $scope.messaging = false;
          $scope.$apply();
        }, 1000);
      }
    }
    
  
    /*
    
      Events listeners
      ----
    
    */
    var _resizeTimer;
    $rootScope.$on('$stateChangeSuccess', function (e, state) {
      $log.log('CoreCtrl @stateChangeSuccess', state.name);
      $scope.currentState = state.name ;// r.$$route.controller;
      
      $scope.unsetMessage();
      // $scope.setMessage(MESSAGES.LOADED, 1500);
      $scope.freeze = false;
      // set initial params here
      $scope.params = cleanService.params($location.search())
      
      // resize window
      clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(function() {
        $(window).trigger('resize');
      }, 300)
      
      switch($scope.currentCtrl) { // move to translation engine
        case 'SearchCtrl':
          $scope.query = $routeParams.query || '';
          $scope.headers.seealso = 'search results';
          break;
        default: 
          $scope.headers.seealso = 'related documents'
          break;
      }
      // set header andccording to the controllers
      
    });
    
    
    /*
      change the given user, programmatically. Cfr httpProvider config in app.js
    */
    $scope.$on(EVENTS.USE_USER, function (e, user) {
      if($scope.user.id != user.id) {
        $log.debug('CoreCtrl @EVENTS.USE_USER', user);
        $scope.user = user;
        /*
          First load only,
          or to be updated whenever a
          CHANGES in resource set occurs
        */
        VisualizationFactory.resource(VIZ.TIMELINE).then(function (res) {
          $log.info('CoreCtrl @EVENTS.USE_USER VisualizationFactory', res);
          $scope.timeline = res.data.result.timeline;
          
        });
      }
    });
    
    $scope.$on(EVENTS.USER_NOT_AUTHENTIFIED, function (e) {
      $scope.unsetMessage(MESSAGES.LOADING);
    });
    
    
    
    /*
      listener $location
      ---
       handle reoute update, e.g on search
    */
    $scope.$on('$locationChangeStart', function (e, path) {
      $log.log('CoreCtrl @locationChangeStart');
      $scope.freeze = 'sigma';
      $scope.setMessage(MESSAGES.LOADING);
    });
    
    $scope.currentPath;
    
    $scope.$on('$locationChangeSuccess', function (e, path) {
      $log.log('CoreCtrl @locationChangeSuccess', path, $location);
      
      // same state as before???
      if($scope.currentPath == $location.path()) {
        $scope.params = $location.search();
        $scope.$broadcast(EVENTS.API_PARAMS_CHANGED);
      
      }
      $scope.currentPath = $location.path();
      
      $scope.unsetMessage();
    });
    
     /*
    
      Playlist
      --------
     */
     $scope.queue = function(item, inprog) {
      // load item by id ...
      
      var itemId = typeof item == 'object'? item.id: item,
          indexOfItemId = $scope.playlistIds.indexOf(+itemId),
          isAlreadyInQueue = indexOfItemId != -1;
           // if the itemId is in the $scope.playlistIds, which is its index?
          // this will contain the list of ids in case the controller needs redirection
          
      $log.info('CoreCtrl -> queue', itemId, inprog? 'do not force update scope': 'force scope update', $scope.playlistIds,itemId )
      $log.log('   ', itemId, isAlreadyInQueue?'is already presend in readlist, skipping ...': 'adding', $scope.playlistIds.indexOf(itemId))
      
      if(isAlreadyInQueue) {
        $scope.queueStatus = 'active';
        if(!inprog)
          $scope.$apply();
        return;
      }
      
      
      
      // otherwise add item to queue...
      if(typeof item == 'object') {
        $scope.playlist.push(item);
        $scope.playlistIds.push(item.id);
        $scope.queueStatus = 'active';
        if(!inprog)
          $scope.$apply();
        $scope.queueRedirect();
      } else { // we need to load the item first, then we can update queue status
        SuggestFactory.getUnknownNode({
          id: itemId
        }).then(function (res) {
          $scope.playlist.push(res.data.result.item);
          $scope.playlistIds.push(res.data.result.item.id);
          $scope.queueStatus = 'active';
          if(!inprog)
            $scope.$apply();
          // collect the ids in order to get the right redirect location
          $scope.queueRedirect();
        })
      }
    };
    
    $scope.getPlaylistFromLocalStorage = function () {
      var storedItems = localStorageService.get('playlist');
      console.log('CoreCtrl -> getPlaylistFromLocalStorage() - n.items:', storedItems.length)
      if(storedItems.length) {
        $scope.playlist    = storedItems;
        $scope.playlistIds = _.map(storedItems, 'id');
        $scope.queueStatus = 'active';
      }
    }
    
    $scope.getPlaylistFromLocalStorage();
    
    $scope.queueRedirect = function() {
      $log.log('CoreCtrl -> queueRedirect()', $state.current); 
      // store in the localstorage just the id
      localStorageService.set('playlist', angular.copy($scope.playlist));
      
      // if there isn't any item, just skip...
      if($scope.playlist.length == 0) {
        $scope.queueStatus = '';
        return;
      }
      
      // Otherwise check the current state
      
      if($state.current.controller == 'NeighborsResourcesCtrl') {
        $log.log('    redirect to: /#/neighbors/'+$scope.playlistIds.join(',')); 
        $location.path('/neighbors/'+$scope.playlistIds.join(',')+'/r');
      }
    };
    
    $scope.hideQueue = function(item) {
      $scope.queueStatus = 'sleep';
    }
    /*
      playlist syncQueue
      check that the playlist is filled with the given ids.
      Otherwise take care of sync.
      @param ids  - array of integer node ids
    */
    $scope.syncQueue = function(ids) {
      if(ids.length != $scope.playlist.length) {
        SuggestFactory.getUnknownNodes({
          ids: ids
        }).then(function (res) {
          $scope.playlist = res.data.result.items;
          
          $scope.playlistIds = res.data.result.items.map(function (d) {
            return d.id;
          });
          
          $scope.queueStatus = 'active';
        });
      };
    };
     
    $scope.toggleQueue = function(item) {
      if($scope.queueStatus == 'sleep')
        $scope.queueStatus = 'active';
      else
        $scope.queueStatus = 'sleep';
    }
    
    // remove from playlist, then redirect.
    $scope.removeFromQueue = function(item) {
      $log.log('CoreCtrl -> removeFromQueue()', item.id);
      var indexToRemove = -1,
          ids = [];
      
      for(var i = 0; i < $scope.playlist.length; i++) {
        if($scope.playlist[i].id == item.id) {
          indexToRemove = i;
        } else { // only for redirection purposes
          ids.push($scope.playlist[i].id);
        }
      }
      if(indexToRemove !== -1)
        $scope.playlist.splice(indexToRemove, 1);
      
      $scope.playlistIds = ids;
      $scope.queueRedirect();
    };
    
    /*
      Filters
    */
    $scope.removeFilter = function(key, value) {
      $log.log('CoreCtrl -> removeFilter() - key:', key, '- value:', value)
      $location.search(key, null);
    }
    
    /*
      Open an issue modal
    */
    $scope.openIssueModal = function (type, target) {
      $scope.freeze = 'sigma';
      $log.log('CoreCtrl -> openIssueModal - type:', type, 'target_id', target.id)
      var modalInstance = $modal.open({
        animation: false,
        templateUrl: 'templates/partials/comment-modal.html',
        controller: 'IssueModalCtrl',
        size: 'sm',
        resolve: {
          user: function(){
            return $scope.user;
          },
          type: function(){
            return type
          },
          target: function(){
            return target;
          },
          items: function() {
            return ResourceRelatedFactory.get({
              id: target.id,
              model:'issue'
            }).$promise
          }
        }
      });
    };
    
     $scope.cancel = function () {
      $modalInstance.dismiss('close');
    };
    
    $scope.isAnnotating = false;
    
    $scope.$on(EVENTS.ANNOTATOR_SHOWN, function() {
      $log.info('CoreCtrl @EVENTS.ANNOTATOR_SHOWN')
      
    })
    
    $scope.$on(EVENTS.ANNOTATOR_HIDDEN, function() {
      $scope.isAnnotating = false;
    })
    
  })
  /*
    This controller handle the modal bootstrap that allow users to propose a new content for something.
  */
  .controller('IssueModalCtrl', function ($scope, $modalInstance, $log, user, type, target, items, ResourceRelatedFactory) {
    $log.log('IssueModalCtrl ready', type, items.result.items)
    $scope.type = type;
    $scope.target = target;
    $scope.user = user;
    $scope.items = items.result.items; // :D
    
    $scope.ok = function () {
      if(type == 'date')
        ResourceRelatedFactory.save({
          model: 'issue',
          id: target.id
        }, {
          type: 'date',
          solution: [$scope.start_date, $scope.end_date],
          description: $scope.description || ''
        }, function(res) {
          console.log(res)
          //$modalInstance.close();
        });
    };

   
  })
  