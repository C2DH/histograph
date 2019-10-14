/* eslint-disable */
/*
  
  Resource task collection
*/
var settings  = require('../../settings'),
    _ = require('lodash'),
    YAML = require('yamljs'),
    parser    = require('../../parser'),
    helpers    = require('../../helpers'),
    inquirer     = require('inquirer'),
    neo4j     = require('seraph')(settings.neo4j.host),
    async     = require('async'),
    path      = require('path'),
    fs        = require('fs'),
    Entity    = require('../../models/entity'),
    Resource  = require('../../models/resource'),
    
    queries   = require('decypher')('./queries/similarity.cyp');

var task = {
  /*
    get couples of entities having the same id.
    Call it before
  */
 // RK: Most likely not being used.
  getClustersByWiki: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.getClustersByWiki'));
    neo4j.query('MATCH (ent:entity) WHERE has(ent.links_wiki) AND ent.links_wiki <> ""  WITH ent.links_wiki as links_wiki, collect({id: id(ent), label: last(labels(ent)), df: ent.df}) as entities WITH links_wiki, entities, length(entities) as c WHERE c > 1 RETURN  links_wiki, entities ORDER by c DESC', function (err, clusters) {
      if(err) {
        callback(err)
        return;
      }
      options.clusters = clusters;
      console.log(clc.blackBright('    collected', clc.magentaBright(clusters.length), 'clusters'));
      callback(null, options);
    })
  },
  /*
    Get the chunks where you can find an entity.
    Based on annotation!
  */
 // RK: does not look like it is being used.
  chunks: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.chunks'));
    
    // get the resources where each entitty is present, along with its annotation
    var q = async.queue(function (entity, nextEntity) {
      console.log(clc.blackBright('\n   entity: '), entity.id, clc.cyanBright(entity.name.substring(0, 24)));
      
      neo4j.query('MATCH (ann:annotation{service:{service},language:{language}})-[rel_a_r:describes]->(res:resource)<-[rel_e_r:appears_in]-(ent) WHERE id(ent) = {id} AND has(ann.language) RETURN {rel_a_r: rel_a_r, rel_e_r: rel_e_r, res: res, ann: ann } ORDER BY id(ent) LIMIT 100', {
        id: entity.id,
        service: 'ner',
        language: 'en'
      }, function (err, paths) {
        if(err) {
          q.kill();
          callback(err);
          return;
        }
        if(paths.length == 0) {
          console.log(clc.blackBright('   skipping...'))
          nextEntity();  
          return;
        }
        // console.log(paths.length)
        
        var qp = async.queue(function (path, nextPath) {
          console.log(clc.blackBright('\n     resource: '), path.res.id, clc.cyanBright(path.res.slug.substring(0, 24)), paths.length - qp.length(), '/', paths.length);
          console.log(path.ann.language)
          // get from the yaml the chunks of texts
          console.log(Resource.getAnnotatedText(path.res, path.ann, {
            with: [57798]
          }))
          // console.log('ttt', path.ann)
          // nextPath();
        }, 1);
        
        qp.push(paths);
        qp.drain = nextEntity;  
      })
      
    }, 1);
    q.push(options.records);
    q.drain = function() {
      callback(null, options);
    };
  },
  
  cleanSimilarity: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.cleanSimilarity'));
    
    /*
      Count relationships to be cleaned
    */
    var loops = 0,
        limit = 500,
        total = 0;

    neo4j.query(queries.count_appear_in_same_document, function (err, results){
      if(err) {
        callback(err);
        return;
      }
      console.log(results);
      total = results[0].total_count;
      loops = Math.ceil(total / limit);
      console.log('    loops needed:', loops,'- total:',total);

      async.timesSeries(loops, function (n, _next) {
        console.log('    loop:', n ,'- offset:', n*limit, '- limit:', limit, '- total:', total)
        neo4j.query(queries.clear_appear_in_same_document, {
          limit: limit
        }, _next);
      }, function (err) {
        if(err)
          callback(err);
        else
          callback(null, options)
      });

    });


    // async.series([
    //   function (next) {
        
    //   },

    // ])
    // neo4j.query(queries.clear_appear_in_same_document, function (err) {
    //   if(err)
    //     callback(err)
    //   else {
    //     console.log(clc.cyanBright('   cleaned'),'every similarity relationship');
    //     callback(null, options);
    
    //   }
    // })
  },
  
  prepare_resource_tfidf_variables: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.prepare_resource_tfidf_variables'));
    neo4j.query(queries.prepare_resource_tfidf_variables, function(err, results) {
      if(err)
        console.log(err)
      callback(null, options)
    });
  },

  prepare_entity_tfidf_variables: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.prepare_entity_tfidf_variables'));
    neo4j.query(queries.prepare_entity_tfidf_variables, function(err, results) {
      if(err)
        console.log(err)
      callback(null, options)
    });
  },

  tfidf: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.tfidf'));
    var loops = 0,
        total = 0,
        limit= isNaN(options.limit)? 5000: options.limit;

    neo4j.query(queries.count_appears_in, function(err, results) {
      if(err) {
        callback(err);
        return;
      }
      total = results[0].total_count;
      loops = Math.ceil(total / limit);
      console.log('    loops needed:', loops,'- total:',total, '- limit:', limit);

      var query = parser.agentBrown(queries.computate_tfidf, options);

      async.timesSeries(loops, function (n, _next) {
        console.log('    loop:', n ,'/', loops)
        neo4j.query(query, {
              offset: n*limit,
              limit: limit
            }, _next);

      }, function (err) {
        callback(err, options);
      });
    });
    
  },
  
  jaccard: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.jaccard'));
    async.waterfall([
      // count expected combinations
      function countExpected (next) {
        console.log('   count expected for entity label: ', options.entity)
        neo4j.query(parser.agentBrown(queries.count_entities, options), next)
      },
      // repeat n time to oid java mem heap space
      function performJaccard (result, next) {
        console.log(result)
        var limit = options.limit || 100,
            total = result[0].total_count,
            loops = Math.ceil(total / limit);
        
        async.timesSeries(loops, function (n, _next) {
          console.log('    loop:', n ,'- offset:', n*limit, '- limit:', limit, '- total:', total, '(loops:', loops,')')
          var query = parser.agentBrown(queries.computate_jaccard_distance, options);
          neo4j.query(query, _.assign(options, {
            offset: n*limit,
            limit: limit
          }), _next);
          
        }, next);
      }
    ], function (err) {
      if(err) {
        callback(err)
      } else {
        console.log(clc.cyanBright('   created'),'jaccard indexes');
        callback(null, options);
      }
    });
  },
  
  cosine: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.cosine'));
    var query = parser.agentBrown(queries.computate_cosine_similarity, options);
    neo4j.query(query, function (err) {
      if(err)
        callback(err)
      else {
        console.log(clc.cyanBright('   created'),'cosine indexes');
        callback(null, options);
    
      }
    })
  },
  
  getMany: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.getMany'), options);
    var query = parser.agentBrown(
      ' MATCH (ent:entity{if:entity}:{:entity}{/if})-[:appears_in]->(r:resource) WITH DISTINCT ent\n'+
      ' SKIP {offset} LIMIT {limit} RETURN ent', options);
    console.log(query);
    neo4j.query(query, {
      limit: +options.limit || 100000,
      offset: +options.offset || 0
    }, function (err, nodes) {
      if(err) {
        callback(err);
        return;
      }
      console.log(clc.blackBright('   nodes:', clc.magentaBright(nodes.length)));
      options.fields = Entity.FIELDS;
      options.records = nodes;
      callback(null, options);
    })
  },
  
  getOne: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.getOne'),'id:', options.id);
    neo4j.query(
      ' MATCH (ent:entity)\n'+
      ' WHERE id(ent)={id} RETURN ent LIMIT 1', {
      id: (+options.id || -1)
    }, function (err, nodes) {
      if(err) {
        callback(err);
        return;
      }
      console.log(clc.blackBright('   nodes:', clc.magentaBright(nodes.length)));
      options.fields = Resource.FIELDS;
      options.records = nodes;
      callback(null, options)
      
    })
  },
  
  enrich: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.discover'));
    var q;

    q = async.queue(function (node, nextNode) {
      console.log(clc.blackBright('    entities remaining:', clc.white.bgMagenta(q.length()), '- done:'), clc.white.bgMagenta(options.records.length - q.length() ) );

      Entity.enrich({
        id: node.id
      }, function (err, n) {
        if(err) {
          q.kill();
          callback(err);
          return;
        }
        console.log('    node', n.id, '/', n.name,'/', clc.cyanBright('enriched'))
        console.log(clc.blackBright('    waiting for the next entity ... remaining:', clc.white.bgMagenta(q.length())))
        nextNode();
      });
    }, 1);
    q.push(options.records);
    q.drain = function() {
      callback(null, options);
    };
  },
  /*
    Start the discover chain for one signle dicoument, useful for test purposes.
  */
  discoverOne: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.resource.discoverOne'));
    if(!options.id || isNaN(options.id)) {
      callback('option --id required')
      return;
    }
    var neo4j    = require('seraph')(settings.neo4j.host);
    var queue = async.waterfall([
      // get pictures and documents having a caption
      function (next) {
        neo4j.read(options.id, function (err, node) {
          if(err) {
            next(err);
            return;
          }
          next(null, node);
        });
      },
      /**
        Nicely add YAGO/TEXTRAZOR api service to extract persons from resources having caption (an/or source field)
      */
      function (node, next) {
        Entity.discover({
          id: node.id
        }, function (err, res) {
          if(err) {
            next(err);
            return
          }
          next
        })
      }
    ], function (err) {
      if(err)
        callback(err);
      else
        callback(null, options);
    });
  },

  slugify: function(options, callback){
    console.log(clc.yellowBright('\n   tasks.entity.slugify'));
    var q = async.queue(function(entity, nextEntity){
      if(entity.slug && entity.slug.length){
        console.log(clc.magentaBright('skipping ent'), entity.name, entity.slug)
        nextEntity();
      } else {
        entity.slug = helpers.text.slugify(entity.name);
        console.log(entity.name, ' -> ', entity.slug)
        neo4j.save(entity, function(err, node){
          if(err){
            q.kill();
            callback(err);
            return
          }
          nextEntity();
        });
      }
    }, 1);
    q.push(options.records);
    q.drain = function(){
      callback(null, options)
    }
  },




};

var fns= _(settings.types.jaccard)
  .map(function(d){
    console.log(d)
    return [
      function(options, callback){
        options.entity = d;
        callback(null, options);
      },
      task.jaccard
    ]
  })
  .flatten()
  .value();
console.log(fns)

module.exports = _.defaults({
  tfidf:[
    task.prepare_resource_tfidf_variables,
    task.prepare_entity_tfidf_variables,
    task.tfidf
  ],
  slugify: [
    task.getMany,
    task.slugify
  ],
  set_entity_cooccurrences: [task.cleanSimilarity].concat(fns)
}, task);