/*
  Shared tasks for manage.js script
  
*/
var settings   = require('../../settings'),
    helpers   = require('../../helpers'),
    neo4j      = require('seraph')(settings.neo4j.host),
    fs         = require('fs'),
    csv        = require('csv'),
    generator  = require('../../generator')(),
    inquirer   = require('inquirer'),
    clc         = require('cli-color'),
    exectimer  = require('exectimer');
    
module.exports = {
  utils: {
    /*
      assign an uuid property whene there's none
    */
    uuid: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.helpers.utils.uuid'));

      neo4j.query('MATCH (n) WHERE size(n.uuid) > 24 RETURN count(n) as total_count', function(err, results) {
        if(err) {
          callback(err);
          return;
        }
        
        async.timesSeries(results[0].total_count, function (n, _next) {
          var uuid = helpers.uuid();

          console.log('    set uuid ', uuid,'for:', n, 'of', results[0].total_count)
          
          neo4j.query('MATCH (n) WHERE size(n.uuid) > 24 WITH n LIMIT 1 SET n.uuid = {uuid} RETURN n', {
            uuid: uuid
          }, function(err, results){
            if(err)
              _next(err);
            console.log(' node internal id:', results[0].id, 'uuid', results[0].uuid);
            _next();
          });
          // get nodes and save nodes

          // neo4j.query(, {
          //   limit: limit
          // }, _next);
        }, function (err) {
          if(err)
            callback(err);
          else
            callback(null, options)
        });
      })
    },
  },
  tick: {
    start: function(options, callback) {
      options.verbose = (options.verbose == undefined) ? true : options.verbose;
      options.__tick = new exectimer.Tick("TIMER");
      if (options.verbose) {
        console.log(clc.yellowBright('\n   tasks.helpers.tick.start'));
      }
      options.__tick.start()
      callback(null, options)
    },
    end: function(options, callback) {
      options.__tick.stop();
      if (options.verbose) {
        console.log(clc.yellowBright('\n   tasks.helpers.tick.end'));
        console.log(clc.yellowBright("   elapsed: "), exectimer.timers.TIMER.duration()/1000000000, clc.yellowBright("sec."));
      }
      options.timer =  exectimer.timers.TIMER;
      callback(null, options);
    }
  },
  
  staffpick: {
    create: function(options, callback) {
      var User = require('../../models/user');

      console.log(clc.yellowBright('\n   tasks.helpers.staffpick.create'));
      console.log(clc.blackBright('    generating user'), clc.magentaBright('MARVIN (staffpick)'));
      User.create({
          username    : 'MARVIN-staff',
          password    : 'marvin',
          email       : 'marvin staffpick',
          firstname   : 'MARVIN',
          lastame     : 'marvin',
          strategy    : 'local', // the strategy passport who creates his account, like local or google or twitter
          about       : '',
          status      : 'enabled',
          picture     : 'https://upload.wikimedia.org/wikipedia/en/c/cb/Marvin_%28HHGG%29.jpg'
      }, function (err, user) {
        if(err)
          callback(null, _.assign(options, {
            username: 'MARVIN-staff',
          }));
        else {
          console.log(clc.blackBright('   user', clc.magentaBright('MARVIN'), 'generated'));
          callback(null, _.assign(options, user));
        }
      });
    },
  },

  marvin: {
    create: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.helpers.marvin.create'));
      
      var User = require('../../models/user');
      User.remove(generator.user.marvin(), function (err) {
        if(err)
          callback(err);
        else {
          console.log(clc.blackBright('   generating user'), clc.magentaBright('MARVIN'));
          User.create(generator.user.marvin(), function (err, user) {
            if(err)
              callback(err)
            else {
              console.log(clc.blackBright('   user', clc.magentaBright('MARVIN'), 'generated'));
          
              callback(null, _.assign(options, {
                marvin: _.assign(user, {
                  pwd: generator.user.marvin().password // its password, before it is encrypted
                })
              }));
            }
          });
        }
      });
    },
    remove: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.helpers.marvin.remove'));
      var User = require('../../models/user');
      console.log(clc.blackBright('   removing user'), clc.magentaBright('MARVIN'));
          
      User.remove(generator.user.marvin(), function (err) {
        if(err)
          callback(err);
        else
          callback(null, options);
      });
    },
    /*
      Authenticate the user (options.marvin)
    */
    login: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.helpers.marvin.login'));
      
      var app = require('../../server').app,
          Session   = require('supertest-session')({
            app: app
          });
          
      options.session = new Session();
      options.session
        .post('/login')
        .send({
          username   : options.marvin.username,
          password   : options.marvin.pwd,
        })
        .end(function (err, res) {
          if(err)
            callback(err);
          else
            callback(null, options);
        })
    },
    
    api: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.helpers.marvin.api'));
      console.log(clc.blackBright('\n   path:'), options.path);
      options.session
        .get(options.path)
        .end(function (err, res) {
          if(err)
            callback(err);
          else {
            console.log('   evaluating', options.part)
            console.log(_.get(res, options.part))
            callback(null, options);
          }
        });
    },
    /*
      Authenticate the user
    */
    logout: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.helpers.marvin.logout'));
      
      options.session.destroy();
      callback(null, options);
    }
  },
  /*
    Print out a csv file, to be used in a waterfall, with err.
    require as options
      filepath
      records
      fields
  */
  csv: {
    stringify: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.helpers.csv.stringify'));
      if(!options.filepath) {
        return callback(' Please specify the output csv file path with --filepath=path/to/source.tsv');
      }
      csv.stringify(options.records, {
        delimiter: options.delimiter || '\t',
        columns:   options.fields,
        header:    true
      }, function (err, data) {
        fs.writeFile(options.filepath,
           data, function (err) {
          if(err) {
            callback(err);
            return
          }
          console.log(clc.blackBright('   file created successfully:', clc.cyanBright(options.filepath), 'containing', clc.magentaBright(options.records.length),'records'));
        
          callback(null, options);
        })
      });
    },
    /*
      REQUIRE an absolute or relative to this file task
    */
    parse: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.helpers.csv.parse'));
      if(!options.source) {
        return callback(' Please specify the file path with --source=path/to/source.tsv');
      }
      csv.parse(''+fs.readFileSync(options.source), {
        columns : true,
        delimiter: options.delimiter || '\t'
      }, function (err, data) {
        if(err) {
          callback(err);
          return;
        }
        console.log(clc.blackBright('   parsing csv file completed,', clc.magentaBright(data.length), 'records found'));
        console.log(clc.blackBright('   e.g:'), _.take(data,2));
        options.data = data;
        callback(null, options);
      });
    }
  },
  
  cypher: {
    raw: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.helpers.cypher.raw'));
      if(!options.cypher) {
        return callback(' Please specify the query path (decypher file without .cyp extension followed by / query name), e.g. --cypher=resource/count_related_users');
      }
      
      var path = options.cypher.split('/');
      
      if(path.length != 2) {
        return callback(' Please specify a valid query path, e.g. --cypher=resource/count_related_users, since you specified ' + options.cypher);
      }
        
      
      var neo4j     = require('seraph')(settings.neo4j.host),
          queries   = require('decypher')('./queries/' + path[0] + '.cyp'),
          parser    = require('../../parser.js'),
          query;
      
      if(!queries[path[1]]) {
        console.log(clc.blackBright('  queries available:'), _.keys(queries));
        return callback(' Please specify a valid query name with --name=<queryname>');
      }
      
      // autotransform stringified array in array
      // e.g. --mimetype=[image,text]
      // is transforemd into options.mimetype = ['image', 'text']
      for(var i in options){
        if(typeof options[i] != 'string')
          continue;
        var pseuroArray = options[i].match(/^\[([^\]]*)\]$/);
        console.log(options[i],'rrrrr', pseuroArray)
        if(!pseuroArray)
          continue;
        
        options[i] = _.map(pseuroArray[1].split(','), function(d) {
          if(isNaN(d))
            return d.trim();
          else
            return +d;
        });
      }
      
      console.log(clc.blackBright('   executing query: ', clc.magentaBright(options.cypher), '...\n'));
      
      // enrich options with timestamp (always useful though)
      if(!options.exec_time || !options.exec_date){
        var now = require('../../helpers').now();
        options.exec_time = now.time;
        options.exec_date = now.date;
      }


      
      query = (options.profile? 'PROFILE ':'') + parser.agentBrown(queries[path[1]], options);
      console.log(query)
      
      console.log('with params')
      console.log(options)
      
      neo4j.query(query, options, function (err, result) {
        console.log(clc.blackBright('\n   result: \n'));
        if(err)
          console.log(err);
        else
          console.log(result);
        
      callback(null, options);
      })
      
    },

    perf: function(options, callback) {
      if(!options.cypher) {
        return callback(' Please specify the query path (decypher file without .cyp extension followed by / query name), e.g. --cypher=resource/count_related_users');
      }

      var path = options.cypher.split('/');

      if(path.length != 2) {
        return callback(' Please specify a valid query path, e.g. --cypher=resource/count_related_users, since you specified ' + options.cypher);
      }

      var neo4j     = require('seraph')(settings.neo4j.host),
          queries   = require('decypher')('./queries/' + path[0] + '.cyp'),
          parser    = require('../../parser.js'),
          query;

      if(!queries[path[1]]) {
        console.log(clc.blackBright('  queries available:'), _.keys(queries));
        return callback(' Please specify a valid query name with --name=<queryname>');
      }
      query = parser.agentBrown(queries[path[1]], options);
      neo4j.query(query, options, callback);
    }
  }
};
