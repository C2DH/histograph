/**
  Our parser. with test
*/
var YAML = require('yamljs'),
    _    = require('lodash');


module.exports = {
  /**
    Neo4j Chypher filter query parser. REplace the {?<neo4jVariableName>}
    with proper WHERE chain.
  */
  agentBrown: function(cypherQuery, filters) {
    var _concatenate = false,
        methods = {
          lt: '<=',
          gt: '>=',
          slt: '<', 
          sgt: '>',
          equals: '=',
          differs: '<>',
          pattern: '=~', // MUST be replaced by a neo4j valid regexp.
          in: 'IN',
          ID: 'id(node) ='
        };
    
    return cypherQuery
        .replace(/[\n\r]/g, ' ')
        .replace(/\{if:([a-zA-Z_]+)\}((?:(?!\{\/if).)*)\{\/if\}/g, function (m, item, contents) {
          // replace if template.
          // console.log(arguments)
          if(filters[item])
            return module.exports.agentBrown(contents, filters);
          else 
            return '';
        })
        .replace(/\{unless:([a-zA-Z_]+)\}((?:(?!\{\/unless).)*)\{\/unless\}/g, function (m, item, contents) {
          // replace unless template.
          // console.log(arguments)
          if(!filters[item])
            return module.exports.agentBrown(contents, filters);
          else 
            return '';
        })
        .replace(/\{each:([a-zA-Z_]+)\sin\s([a-zA-Z_]+)\}((?:(?!\{\/each).)*)\{\/each\}/g, function (m, item, collection, contents) {
          // replace loop {each:language in languages} {:title_%(language)} = {{:title_%(language)}} {/each} with join.
          // produce something like
          // title_en = {title_en}, title_fr = {title_fr}
          // which should be cypher compatible.
          // This function call recursively agentBrown() 
          var template = [];
          for(var i in filters[collection]) {
            var f = {};
            f[item] = filters[collection][i];
            template.push(module.exports.agentBrown(contents, f));
          }
          return template.join(', ');
        })
        .replace(/\{:([a-z_A-Z]+)\}/g, function (m, placeholder) {
          // replace dynamic variables (used for label)
          // e.g. `MATCH (ent:{:type})` becomes `MATCH (ent:person)` if type = 'person'
          return filters[placeholder]
        })
        .replace(/\{:([a-z_A-Z%\(\)\s]+)\}/g, function (m, placeholder) {
          // replace dynamic variables, e.g to write ent.title_en WHERE 'en' is dynaically assigned,
          // write as query
          // ent.{:title_%(language) % language}
          // and provide the filters with language
          return placeholder.replace(/%\(([a-z_A-Z]+)\)/g, function (m, property) {
            return filters[property]
          });
        })
        .replace(/\{(AND|OR)?\?([a-z_A-Z]+):([a-z_A-Z]+)__([a-z_A-Z]+)\}/g, function (m, operand, node, property, method) {
          // replace WHERE clauses
          var chunk = '',
              segments = [
                node + '.' + property,
                methods[method],
                '{' + property + '}'//filters[property]
              ];
          
          if(!methods[method])
            throw method + ' method is not available supported method, choose between ' + JSON.stringify(methods);
            
          if(!filters[property])
            return '';
          
          if(method == 'ID')
            segments = [methods[method].replace('node', node), filters[property]];
          
          if(_concatenate && operand == undefined)
            _concatenate = false; // start with WHERE
          
          
          if(!_concatenate)
            chunk = ['WHERE'].concat(segments).join(' ') 
          else 
            chunk = [operand].concat(segments).join(' ');
          
          _concatenate = true;
          return chunk;
        })
  },
  /**
   annotate a string acciording to the splitpoints.
   points is a Yaml
   */
  annotate: function(content, points, options) {
    var options = options || {},
        splitpoints = [], // sorted left and right points in order to segment content. 
        chunks = []; // the annotation chunks to be enriched.
    
    // sort points by context.left ASC, context.right ASC
    points = _.sortBy(points, function(d){
      return d.context.left + d.context.right
    });
    
    
    // array of left plus right splitpoint to chunk the string
    splitpoints = _.sortBy(_.unique([0, content.length].concat(
      _.map(points, function(d){
        return d.context.left
      })).concat(
      _.map(points, function(d){
        return d.context.right
      }))
    ), function(d) {
      return d
    });
    
    // console.log(splitpoints)
    for(var i = 0; i < splitpoints.length - 1; i++) {
      
      // get the leftmost or rightmost for this splitpoint
      var ls = _.unique(_.map(points.filter(function(d) {
        return d.context.left == splitpoints[i] || d.context.right == splitpoints[i + 1]
      }), 'id'));
      
      chunks.push({
        s: content.slice(splitpoints[i], splitpoints[i + 1]),
        l: splitpoints[i],
        r: splitpoints[i + 1],
        links: ls
      })
    };
    
    if(!options.isMatch)
      // join chunks as markdown string like a pro
      return _.reduce(chunks, function(reduced, c) {
        var res = [reduced.s || reduced];
        
        if(c.links.length)
          res.push('[', c.s, '](', c.links.join(','), ')');
        else
          res.push(c.s);
          
        return res.join('');
      });
    else {
      var mch = [],
        fch = chunks.filter(function (d) {
          return d.links.length
        });
      // concatenate adjacent fch (filtered chunks)
      for(var i = 0, l = fch.length; i < l; i++) {
        if(i == 0 && fch[i].l > 0)
           mch.push(' [...] ')
        if(fch[i].links.length && fch[i].links[0] != -1)
          mch.push('[', fch[i].s, '](', fch[i].links.join(','), ')');
        else
          mch.push(fch[i].s)
        if(i + 1 < l && fch[i].r != fch[i+1].l)
          mch.push(' [...] ')
        else if(i == l-1 && fch[i].r < content.length)
          mch.push(' [...] ')
          
      }

      return mch.join('')
      // .filter(function (d) {
      //   return d.links.length
      // })
    }
      
  },

  yaml: function(yaml) {
    return YAML.parse(yaml)
  },
  
  /*
    get the chunks from a YAML content for the specific ids only,
    then annotate them.
    @param content - the text to be annotated
    @param options.points  - list of splitpoint contexts, with optional identifier
    @param options.ids     - list of ids to filter the splitpoints with
  */
  annotateMatches: function(content, options) {
    var points = [],
        contexts = [];
    options.points.forEach(function (d) {
      // reduce the annotation for the given ids ONLY.
      if(options.ids.indexOf(+d.id) == -1)
        return;
      // get the very first sentence with a simple tokenizer.
      
      // add the new interval as km splitpoint
      points.push({
        id: -1,
        context: {
          left:  Math.max(0, d.context.left - 50),
          right: d.context.left
        }
      },{
        id: -1,
        context: {
          left: d.context.right,
          right: Math.min(d.context.right + 50, content.length),
        }
      });
      points.push(d);
    });
    // console.log(points);
    return module.exports.annotate(content, points, {
      isMatch: true
    });
  },
  // divide a long text in paragraphs (really simple one)
  // according to multiple linebreaks
  paragraphs: function (options) {
    return _.compact(_.map(options.text.split(/[;\.\n\r]+[\n\r]{2,}/g), _.trim));
  }
};