/* eslint-env browser */
/* globals angular, __histograph_globals */
angular.module('histograph')
  .constant('SETTINGS', {
    // types: types,
    // eslint-disable-next-line camelcase
    analytics: __histograph_globals.analytics,
  })
  .constant('GRAMMAR', {
    AS_TYPES: [{
      name: 'of any type',
    }].concat(__histograph_globals.types.resources.map(type => ({
      name: type, // todo: add translations
      filter: `type=${type}`
    }))),
    IN_TYPES: [{
      name: 'in any resource type',
    }].concat(__histograph_globals.types.resources.map(type => ({
      name: `in ${type}`, // todo: add translations / pluralize
      filter: `type=${type}`
    })))
  })
