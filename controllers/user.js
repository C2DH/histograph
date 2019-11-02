/**

  API Controller for hg:User
  ===
  
*/
var settings   = require('../settings'),
    helpers    = require('../helpers'),
    validator  = require('../validator'),

    multer     = require('multer'),
    _          = require('lodash'),
    neo4j      = require('seraph')(settings.neo4j.host),
    
    User       = require('../models/user'),

    fields     = [
      {
        field: 'email',
        check: 'isEmail',
        error: 'it is not a real email'
      },
      {
        field: 'password',
        check: 'isLength',
        args: [
          8,
          32
        ],
        error: 'password have to ...'
      }
    ];


module.exports = () => ({
    // set user fav language. the resources will be 
    setLanguage: function (req, res) {
      return res.ok({
        item: req.session
      });
    },
    /*
      give some information about current session
    */
    session: function (req, res) {
      return res.ok({
        item: req.user
      });
    },

    /*
      GET:/activate the user, directly from the activation link.
      Send an activation link by email.
    */
    activate: [multer(), function (req, res) {
      var form = validator.request(req, {
            email: '',
            k:''
          }, {
            fields:[
              {
                field: 'email',
                check: 'isEmail',
                error: 'it is not a real email'
              },
              {
                field: 'k',
                check: 'isLength',
                args: [
                  8,
                ],
                error: 'please provide the k. Otherwise, contact the system administator'
              }
            ]
          });
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      console.log(form)
      neo4j.query('MATCH(n:user {email:{email}, activation:{key}}) SET n.status={status} RETURN n', {
        email: form.params.email,
        key: form.params.k,
        status: 'enabled'
      }, function(err, items) {
        if(err)
          return res.error(400, {message: 'bad request'});
        return res.ok();
      });
    }],


    pulse: function(req, res) {
      var form = validator.request(req, {
            limit: 10,
            offset: 0
          });
      User.pulse(req.user, form.params, function (err, items, info) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          items: _.map(items, function (d){
            if(d.props.last_modification_time)
              d.props.last_modification = helpers.fromNow(d.props.last_modification_time);
            return d;
          })
        }, info);
      });
    },
    /*
      The number of expected actions performed by other users at distance 2
    */
    pulsations: function(req, res) {
      var form = validator.request(req, {
            limit: 10,
            offset: 0
          });
      User.pulsations(req.user, function (err, info) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({}, info);
      });
    },

    /*
      User specific random crowdsourcing
    */
    task: function(req, res) {
      User.task(req.user, {
        what: req.params.what
      }, function (err, items) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({item: items[0]}, req.params);
      })
    },

    /*
      Return the list of last things happened in your network
    */
    noise: function(req, res) {
      var form = validator.request(req, {
            limit: 10,
            offset: 0,
            id: req.user.id // default the single user
          });
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      // console.log('passed here', req.user, form.params)
      User.noise(req.user, form.params, function (err, items, info) {
        helpers.models.getMany(err, res, items, info, form.params);
      });
    },

    /*
      Return a list of last user-touched resources.

    */
    getRelatedResources: function(req, res) {
      var form = validator.request(req, {
            limit: 10,
            offset: 0,
            id: req.user.id // default the single user
          });
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      // console.log(form)
      User.getRelatedResources({
        id: form.params.id
      }, form.params, function (err, items, info) {
        helpers.models.getMany(err, res, items, info, form.params);
      });
    },

    /*
      Get bipartite graph of user most loved resource network
    */
    getRelatedResourcesGraph: function (req, res) {
      var form = validator.request(req, {
            id: req.user.id // default the single user
          });
       if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      User.getRelatedResourcesGraph({
        id: form.params.id
      },
      _.assign({}, form.params,{
        limit: 500
      }), function (err, graph) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          graph: graph
        }, _.assign({
          type: 'monopartite'
        }, form.params));
      });
    },

  updateApiKey: (req, res) => {
    const callback = (err, user) => {
      if (err) return helpers.cypherQueryError(err, res)
      return res.ok({ user })
    }
    User.regenerateApiKey(req.user, {}, callback)
  },
})
