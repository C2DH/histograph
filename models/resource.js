
/**
 * Resource Model for documents, video etc...
 * ======================
 *
 */
var settings  = require('../settings'),
    helpers   = require('../helpers'),
    parser    = require('../parser'),
    neo4j     = require('seraph')(settings.neo4j.host),
    
    rQueries  = require('decypher')('./queries/resource.cyp'),
    
    models    = require('../helpers/models'),
    
    fs        = require('fs'),
    path      = require('path'),
    async     = require('async'),
    YAML      = require('yamljs'),
    _         = require('lodash');

const { get } = require('lodash')
const { executeQuery } = require('../lib/util/neo4j')

var Resource = function() {
  this.id; 
  this.source;
  this.date;
  this.languages = [];
  this.start_date;
  this.end_date;
  this.start_time;
  this.end_time;
  
  this.title_search;
  this.caption_search;
  
  this.positionings = [];
  this.places = [];
  this.locations = [];
  this.persons = [];
  this.comments = [];
  this.collections = [];
};


module.exports = {
  FIELDS: [
    'id',
    'slug',
    'name',
    'title_en',
    'caption_en',
    'url',
    'url_en', // the txt file in english
    'start_date',
    'end_date',
    'viaf_id'
  ],
  
  UPDATABLE: [
    'slug',
    'name',
    'title_en',
    'caption_en',
    'url_en',
    'start_date',
    'end_date',
    'viaf_id'
  ],

  /**
    get a complete resource object (with versions, comments etc...).
    @param resource.id - numeric identifier only
    @param user - the current user
   */
  get: (resource, user, next) => {
    const id = typeof resource !== 'object'
      ? resource
      : resource.id
    const { username } = user

    executeQuery(rQueries.get_resource_with_details, { id, username })
      .then(r => next(null, r))
      .catch(err => next(err))
  },

  /*
    Available params are limit, offset, order by.
  */
  getMany: (params, next) => {
    models.getMany({
      queries: {
        count_items: rQueries.count_resources,
        items: rQueries.get_resources
      },
      params
    }, (err, results) => {
      if (err) next(err)
      else next(null, module.exports.normalize(results.items, params), results.count_items)
    })
  },
  /*
    Get annotated text
    for a given (resource:resource) node and (annotation:annotation)
  */
  getAnnotatedText: function(resource, annotation, params) {
        var annotations,
            availableAnnotationFields = [],
            content;
        // parse Yaml if it it hasn't been done yet
        if(typeof annotation.yaml == 'string')
          annotation.yaml = YAML.parse(annotation.yaml);
        annotation.yaml == null && console.log(annotation)
        
        if(!annotation.yaml) {
          return {
            language: annotation.language,
            annotation: ''
          }
        }
        
        // recover content from disambiguation field section, as a list (antd not as a string)
        content = ['title', 'caption', 'content'].map(function (field){
          var c = module.exports.getText(resource, {
            fields: [field],
            language: annotation.language
          });
          if(c.length) // recreate a fields list of known annotations
            availableAnnotationFields.push(field);
          return c;
        });

        if(params && params.with && _.last(['title', 'caption', 'content']) == 'url')   {
          // for the NON URL fields, just do the same as before
          // console.log('content', resource.title_en, annotation.language)
          var fulltext = content.pop(),
              offset   = content.length? _.compact(content).reduce(function(p,c) {
                return p.length + c.length + '§ '.length;
              }): 0;
          // console.log(annotation.yaml)
          // Annotate the fields as usual, just filtering the points. Note the _.compact that eliminates empty content :()
          annotations = parser.annotate(_.compact(content).join('§ '), annotation.yaml.filter(function (d) {
            return params.with.indexOf(+d.id) != -1
          })).split('§ ');
          
          // annotate partials MATCHES only
          annotations.push(parser.annotateMatches(fulltext, {
            points: annotation.yaml,
            ids: params.with,
            offset: offset - 2
          }));
          content.push(fulltext); // pop before, push right now. TO BE REFACTORED.
        } else {
          annotations = parser.annotate(_.compact(content).join('§ '), annotation.yaml, {}).split('§ ');
        }
        
        annotation.annotated = {};
        
        availableAnnotationFields.forEach(function (field, i){
          annotation.annotated[field] = annotations[i];
        });
        // console.log('\n\n',resource.slug, annotation.language, annotations)
        return {
          language: annotation.language,
          annotation: annotation.annotated
        }
    
  },
  normalize: function(node, params) {
    if(_.isArray(node))
      return node.map(function (n) {
        return module.exports.normalize(n, params);
      });
    // resolve annotations, if they've been provided
    if(node.annotations) {
      node.annotations = _.map(_.filter(node.annotations, 'language'), function (ann) {
        return module.exports.getAnnotatedText(node.props, ann, params);
      });
    }
    
    // node.themes = _.values(node.themes || []).filter(function (n) {
    //   return n.id
    // });
    // node.places = _.values(node.places || []).filter(function (n) {
    //   return n.id
    // });
    // node.persons = _.values(node.persons).filter(function (n) {
    //   return n.id
    // });
    // node.locations = _.values(node.locations).filter(function (n) {
    //   return n.id
    // });
    // node.organizations = _.values(node.organizations).filter(function (n) {
    //   return n.id
    // });
    // node.social_groups = _.values(node.social_groups).filter(function (n) {
    //   return n.id
    // });
    return node;
  },
  /*
    Provide here a list of valid ids
  */
  getByIds: function(params, next) {
    // remove orderby from params
    if(params.orderby)
      delete params.orderby
    
    var query = parser.agentBrown(rQueries.get_resources, params);
    // console.log(query)

    // console.log('getById', query, params)
    neo4j.query(query, _.assign(params, {
      limit: params.limit || params.ids.length,
      offset: 0
    }), function (err, items) {
      if(err) {
        console.log(err)
        next(err);
        return;
      }
      
      // console.log(params, items.length)
      var itemsAsDict = _.keyBy(module.exports.normalize(items, params),'id');
      // console.log(itemsAsDict)
      next(null, params.ids.map(function (id) {
        return itemsAsDict[''+id]
      }), {
        total_items : items.length
      });
    });
  },

  /* eslint-enable */
  findByUuidOrSlug(uuidOrSlug, cb) {
    const params = { uuidOrSlug }
    const query = parser.agentBrown(rQueries.find_by_uuid_or_slug, params)
    return neo4j.query(query, params, cb)
  },

  updateTopicModellingScores(uuid, scores, cb) {
    const params = { uuid, scores }
    const query = parser.agentBrown(rQueries.update_topic_modelling_scores, params)
    return neo4j.query(query, params, cb)
  },

  findTopicModellingScores(startTime, endTime, cb) {
    const params = { start_time: startTime, end_time: endTime }
    const query = parser.agentBrown(rQueries.find_topic_modelling_scores, params)
    return neo4j.query(query, params, cb)
  },
  /* eslint-disable */

  search: function(options, next) {
    // at least options.search should be given.
    // note that if there is a solr endpoint, this endpoint should be used.
    // you can retrieve later the actual resources by doi.
  },
  /*
    Create a Resource item.
    Some properties are compulsory.
    @return (err, resource:Resource)
  */
  create: function(properties, next) {
    var query;
    // create start_time if its not present
    if(!properties.start_time && properties.start_date) {
      properties = _.assign(properties, helpers.reconcileIntervals({
        start_date: properties.start_date,
        end_date: properties.end_date,
        format: properties.dateformat || 'YYYY-MM-DD',
        strict: properties.datestrict
      }));
      
    } else if(properties.start_time && properties.end_time) {
      // calculate month
      properties = _.assign(properties, helpers.getMonths(properties.start_time, properties.end_time))
    }
    properties = _.assign(properties, {
      uuid: helpers.uuid(),
      username: properties.user.username
    });
    
    query = parser.agentBrown(rQueries.merge_resource, properties);
    
    neo4j.query(query, properties, function (err, node) {
      if(err) {
        next(err);
        return;
      }
      if(!node.length) {
        next(helpers.IS_EMPTY);
        return;
      }
      next(null, node[0]);
    });
  },
  
  /*
    Create a nice index according to your legay index.
    Not needed if using node_auto_index!
  */
  index: function(resource, next) {
    async.parallel(_.map(['full_search', 'title_search'], function(legacyindex) {
      return function(n) {
        console.log('indexing', legacyindex, resource.props[legacyindex])
        neo4j.legacyindex.add(legacyindex, resource.id, (legacyindex, resource[legacyindex] || resource.props[legacyindex] || '').toLowerCase(), n);
      }
    }), next);
  },
  
  /*
    Create a relationships with an entity. If the entity dioes not exist, it will create it.
    Entity object MUST contain at least: name and type.
  */
  createRelatedEntity: function(resource, entity, next) {
    var Entity = require('../models/entity');

    Entity.create(_.assign(entity, {
      resource: resource
    }), function (err, entity) {
      if(err) {
        next(err);
        return;
      }
      next(null, entity);
    });
  },  
  /*
    Create a special relationship (u)-[:♥]->(res) between the resource and the user
    
  */
  createRelatedUser: function(resource, user, next) {
    var now   = helpers.now();
        
    neo4j.query(rQueries.create_related_user, { 
      id: resource.id,
      username: user.username,
      creation_date: now.date,
      creation_time: now.time
    }, function (err, nodes) {
      if(err) {
        next(err);
        return;
      }
      next(null, nodes[0]);
    });
  },
  /*
    Remove a rlikes relationship, only if the current authentified user
    is the owner of the relationship.
  */
  removeRelatedUser: function(resource, user, next) {
    neo4j.query(rQueries.remove_related_user, { 
      id: resource.id,
      username: user.username
    }, function (err, nodes) {
      if(err) {
        next(err);
        return;
      }
      next(null, nodes[0]);
    });
  },
  /*
    Get the list of users related to the resource
  */
  getRelatedUsers: function(resource, params, next) {
    models.getMany({
      queries: {
        count_items: rQueries.count_related_users,
        items: rQueries.get_related_users
      },
      params: {
        id:     +resource.id,
        limit:  +params.limit || 10,
        offset: +params.offset || 0
      }
    }, function (err, results) {
      if(err) {
        console.log(err)
        next(err);
        return;
      }

      next(null, _.filter(results.items, 'id'), {
        total_items: results.count_items
      });
    }); 
  },
  /*
    Return the list of actions mentioning the requested resource.
    The params.action param should be a valid action 'kind', cfr server.js
  */
  getRelatedActions: function(resource, params, next) {
    models.getMany({
      queries: {
        count_items: rQueries.count_related_actions,
        items: rQueries.get_related_actions
      },
      params: {
        id:     resource.id,
        kind:   params.action,
        limit:  params.limit,
        offset: params.offset
      }
    }, function (err, results) {
      if(err) {
        console.log(err)
        next(err);
        return;
      }

      next(null, _.map(results.items, function (d) {
        d.props.annotation = parser.yaml(d.props.annotation);
        return d
      }), {
        total_items: results.count_items
      });
    }); 
  },
  
  update: function(id, properties, next) {

  },
  /*
    Change the resoruce label to :trash in order to manually
    @return (err, resource:Resource)
  */
  remove: function(resource, next) {
    neo4j.query(rQueries.remove_resource, {
      id: resource.id
    }, function(err) {
      if(err)
        next(err);
      else
        next();
    });
  },
  /**
    Monopartite graph
    DEPRECATED. cfr getRelatedEntitiesGraph
  */
  getGraphPersons: function(id, properties, next) {
    var options = _.merge({
      id: +id, 
      limit: 100
    }, properties);
    
    helpers.cypherGraph(rQueries.get_graph_persons, options, function (err, graph) {
      if(err) {
        next(err);
        return
      };
      next(null, graph);
    });
  },
  
  /**
    Monopartite graph
    params must contain an integer ID
  */
  getRelatedEntitiesGraph: function(params, next) {
    var query = parser.agentBrown(rQueries.get_related_entities_graph, params)
    helpers.cypherGraph(query, params, function (err, graph) {
      if(err) {
        next(err);
        return
      };
      next(null, graph);
    });
  },
  
  /**
    Monopartite graph of related resources
    DEPRECATED getRelatedEntitiesGraph
  */
  getRelatedResourcesGraph: function(resource, params, next) {
    helpers.cypherGraph(rQueries.get_related_resources_graph, _.assign({
      id: resource.id
    }, params), function (err, graph) {
      if(err) {
        next(err);
        return
      };
      next(null, graph);
    });
  },
  
  /**
    Timeline
  */
  getTimeline: function (properties, next) {
    helpers.cypherTimeline(rQueries.get_timeline, properties, function (err, timeline) {
      if(err){
        next(err);
      }
      else
        next(null, timeline);
    });
  },
  /*
    Return the timeline of document related resource.
  */
  getRelatedResourcesTimeline: function(resource, properties, next) {
    helpers.cypherTimeline(rQueries.get_related_resources_timeline, _.assign({}, properties, resource), function (err, timeline) {
      if(err)
        next(err);
      else
        next(null, timeline);
    });
  },
  
  
  getRelatedResources: function (params, next) {
    models.getMany({
      queries: {
        count_items: rQueries.count_related_resources,
        items: rQueries.get_related_resources
      },
      params: params
    }, function (err, results) {
      if(err) {
        console.log(err)
        next(err);
        return;
      }
      next(null, results.items, results.count_items);
      
      // module.exports.getByIds(_.assign({}, params, {
      //   ids: _.map(results.items, 'target')
      // }), function (err, items){
      //   next(null, items, results.count_items);
      // });
      
    }); 
    
  },
  /*
    Return the related entities according to type.
    @param params - a dict containing at least the entity label (type: 'person|location') and the resource id
  */
  getRelatedEntities: function (params, next) {
    models.getMany({
      queries: {
        count_items: rQueries.count_related_entities,
        items: rQueries.get_related_entities
      },
      params: {
        entity: params.entity,
        id: params.id, // uuid is string
        limit: +params.limit || 10,
        offset: +params.offset || 0
      }
    }, function (err, results) {
      if(err) {
        console.log(err)
        next(err);
        return;
      }
      next(null, results.items, results.count_items);
    }); 
    
  },
  
  /*
    Return the 
  */
  getText: function(resource, options) {

    return _.compact(options.fields.map(function (d) {
      if(d == 'url') {
        /* 
          NOTE: Since July 2019 we store content in `content_<xx>` fields
          in the database. Therefore we first try to get content from one of
          these fields and if it is not there, resort to reading from a file.
        */
        const contentFromResource = get(resource, `content_${options.language}`)
        if (contentFromResource !== undefined) return contentFromResource

        if(!_.isEmpty(resource[d + '_' + options.language])) {
          try{
            var stats = fs.statSync(settings.paths.txt + '/' + resource[d + '_' + options.language]);
            if(stats.size > (settings.disambiguation.maxSize || 100000))
              return '';
            return fs.readFileSync(settings.paths.txt + '/' + resource[d + '_' + options.language], {
              encoding: 'utf8'
            }) || '';
          } catch(e) {

            // console.log('!warning, resource.getText(), file not found or not valid...', e)
            return '';
          }
        }
        return '';
      }
      if(settings.disambiguation.regexp && settings.disambiguation.regexp[d]) {
        // apply recursively
        
        var content = (resource[d + '_' + options.language] || '')
        _.each(settings.disambiguation.regexp[d], function (rule) {
          content = content.replace(rule.pattern, rule.replace);
        })
        console.log('content', content)

        return content
      }
      // console.log(options, d, d + '_' + options.language)
      return resource[d + '_' + options.language] || '';
    })).join('. ');
  },
}