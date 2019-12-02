/* eslint-env browser */
/* globals angular, io */
/* eslint-disable prefer-arrow-callback, func-names, object-shorthand */
import { proxyWithPreparedApiQueryParameters } from './utils'
/**
 * @ngdoc service
 * @name histograph.services
 * @description
 * # core
 * Resource REST API service Factory.
 */
angular.module('histograph')
  /*
    Check & clean service
  */
  .factory('cleanService', function () {
    return {
      params: function (params) {
        return params;
      }
    };
  })
  .factory('ActionsService', function ($resource, HgSettings) {
    const resource = $resource(`${HgSettings.apiBaseUrl}/api/actions/:id/:aspect`, {}, {
      createNewAction: { method: 'POST', isArray: false },
    })

    return {
      unlinkEntity: (entityUuid, resourceUuid) => {
        const payload = {
          type: 'unlink-entity',
          parameters: { entityUuid, resourceUuid }
        }
        return resource.createNewAction(payload).$promise
      },
      bulkUnlinkEntity: (entityUuid) => {
        const payload = {
          type: 'unlink-entity-bulk',
          parameters: { entityUuid }
        }
        return resource.createNewAction(payload).$promise
      },
      linkEntity: (entityUuid, resourceUuid, context, contextLocation) => {
        const payload = {
          type: 'link-entity',
          parameters: {
            entityUuid, resourceUuid, context, contextLocation
          }
        }
        return resource.createNewAction(payload).$promise
      },
      changeEntityType: (entityUuid, oldType, newType) => {
        const payload = {
          type: 'change-entity-type',
          parameters: { entityUuid, oldType, newType }
        }
        return resource.createNewAction(payload).$promise
      },
      mergeEntities: (originalEntityUuidList, newEntityUuid) => {
        const payload = {
          type: 'merge-entities',
          parameters: { originalEntityUuidList, newEntityUuid }
        }
        return resource.createNewAction(payload).$promise
      },
      getPerformedActions: (skip = 0, limit = 50) => resource.query({ skip, limit }).$promise
    }
  })
  /*
    Get a list of resource
  */
  .factory('ResourcesFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/resource`, {}, {
      query: { method: 'GET' },
    });
  })
  /*
    Get/Update/Delete one resource
  */
  .factory('ResourceFactory', function ($resource, HgSettings) {
    const resource = $resource(`${HgSettings.apiBaseUrl}/api/resource/:id`, {}, {
      query: { method: 'GET' },
    });
    return {
      get: (...args) => proxyWithPreparedApiQueryParameters(resource, 'get', args)
    }
  })
  /*
    DEPRECATED
  */
  .factory('ResourceVizFactory', function ($resource, HgSettings) {
    const resource = $resource(`${HgSettings.apiBaseUrl}/api/resource/:id/:viz`, {}, {
      query: { method: 'GET' },
    });
    return {
      get: (...args) => proxyWithPreparedApiQueryParameters(resource, 'get', args)
    }
  })
  /*
    Should contain all viz methods available (GET only vis)
    DEPRECATED
  */
  .factory('VisualizationFactory', function ($http, HgSettings) {
    return {
      resource: function (viz, options) {
        return $http.get(`${HgSettings.apiBaseUrl}/api/resource/${viz}`, {
          params: options
        });
      }
    };
  })
  /*
    Add a comment to a resource
    DEPRECATED
  */
  .factory('ResourceCommentsFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/resource/:id/related/comment`, {}, {
      query: { method: 'GET' },
    });
  })
  /*
    Add / get :model related to resource
  */
  .factory('ResourceRelatedFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/resource/:id/related/:model`);
  })
  /*
    Add / get :model related to resource
  */
  .factory('ResourceRelatedVizFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/resource/:id/related/:model/:viz`);
  })
  /*
    POST Save a new inquiry (modify it) or GET list of inquiries
  */
  .factory('InquiryFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/inquiry/:id`);
  })
  /*
    Add / get :model related to inquiries
  */
  .factory('InquiryRelatedFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/inquiry/:id/related/:model`);
  })
  /*
    Get/Update/Delete one collection
  */
  .factory('CollectionFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/collection/:id`, {}, {});
  })
  .factory('CollectionRelatedFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/collection/:id/related/:model`, {}, {});
  })
  .factory('CollectionVizFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/collection/:id/:viz`, {
      id: '@id',
      viz: '@viz'
    });
  })
  /*
    Get/Update/Delete one entity
  */
  .factory('EntityFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/entity/:id`, {}, {});
  })
  .factory('EntityRelatedFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/entity/:id/related/:model/:viz`);
  })
  .factory('EntityExtraFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/entity/:id/:extra, HgSettings`, {}, {});
  })
  .factory('EntityRelatedExtraFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/entity/:id/related/:model/:related_id/:extra`, {}, {});
  })
  /*
    model - the related model
    type  - type of viz, eg graph or timeline
  */
  .factory('EntityRelatedVizFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/entity/:id/related/:model/:viz`);
  })
  /*
    GET cooccurrences
  */
  .factory('CooccurrencesFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/cooccurrences/:model/related/:projected_model`, {}, {
      query: { method: 'GET' },
    });
  })
  /*
    vote up vote down delete one comment
  */
  .factory('CommentFactory', function ($http, HgSettings) {
    return {
      upvote: function (options) {
        return $http.post(`${HgSettings.apiBaseUrl}/api/comment/${options.id}/upvote`);
      },
      downvote: function (options) {
        return $http.post(`${HgSettings.apiBaseUrl}/api/comment/${options.id}/downvote`);
      },
    };
  })
  /*
    Get a list of resource
  */
  .factory('UserFactory', function ($resource, HgSettings) {
    const resource = $resource(`${HgSettings.apiBaseUrl}/api/user/:method/:extra`, {}, {});
    return {
      get: (...args) => proxyWithPreparedApiQueryParameters(resource, 'get', args)
    }
  })
  /*
    Add / get :model related to user related
  */
  .factory('UserRelatedFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/user/:id/related/:model`);
  })
  /*
    Add / get :model related to resource
  */
  .factory('UserRelatedVizFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/user/:id/related/:model/:viz`);
  })
  /*
    Search & Suggest
  */
  .factory('SuggestFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/suggest/:m/:ids/:model/:viz`, {}, {
      getVIAF: {
        method: 'GET',
        params: {
          m: 'viaf',
          model: ''
        }
      },
      getDbpedia: {
        method: 'GET',
        params: {
          m: 'dbpedia',
          model: ''
        }
      },
      getUnknownNodes: {
        method: 'GET',
        params: {
          m: 'unknown-nodes',
          model: ''
        }
      },
      getStats: {
        method: 'GET',
        params: {
          m: 'stats',
          model: ''
        }
      },
      getEntities: {
        method: 'GET',
        params: {
          m: 'entity',
          model: ''
        }
      },
      getResources: {
        method: 'GET',
        params: {
          m: 'resource',
          model: ''
        }
      },
      getUnknownNode: {
        method: 'GET',
        params: {
          m: 'unknown-node',
          model: ''
        }
      },
      allInBetween: {
        method: 'GET',
        params: {
          m: 'all-in-between',
          model: ''
        }
      },
      getShared: {
        method: 'GET',
        params: {
          m: 'shared',
          model: 'resource' // default
        }
      }
    });
  })

  .factory('SuggestAllInBetweenFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/suggest/all-in-between/:ids/:model`);
  })

  .factory('SuggestAllInBetweenVizFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/suggest/all-in-between/:ids/:model/:viz`);
  })

  .factory('SearchFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/suggest/:model`);
  })

  .factory('SearchVizFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/suggest/:model/:viz`);
  })


  .factory('IssueFactory', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/issue`);
  })

  .factory('DbpediaFactory', function ($resource) {
    return $resource('http://lookup.dbpedia.org/api/search.asmx/PrefixSearch', {}, {
      headers: {
        Accept: 'application/json'
      }
    });
  })

  .factory('CorpusSettings', function ($resource, HgSettings) {
    return $resource(`${HgSettings.apiBaseUrl}/api/corpus-settings`);
  })

  /*
    Socket.io service, thqnks to http://briantford.com/blog/angular-socket-io
  */
  .factory('socket', function ($rootScope) {
    const socket = io.connect();
    return {
      on: function (eventName, callback) {
        socket.on(eventName, function (...args) {
          $rootScope.$apply(function () {
            callback.apply(socket, args);
          });
        });
      },
      emit: function (eventName, data, callback) {
        socket.emit(eventName, data, function (...args) {
          $rootScope.$apply(function () {
            if (callback) {
              callback.apply(socket, args);
            }
          });
        });
      }
    };
  });
