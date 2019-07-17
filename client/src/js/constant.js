/* eslint-env browser */
/* globals angular, __hg_settings */
angular.module('histograph')
  .constant('SETTINGS', {
    // types: types,
    // eslint-disable-next-line camelcase
    analytics: __hg_settings.analytics,
  })
  .constant('GRAMMAR', {
    AS_TYPES: [{
      name: 'of any type',
    }].concat(__hg_settings.types.resources.map(type => ({
      name: type, // todo: add translations
      filter: `type=${type}`
    }))),
    IN_TYPES: [{
      name: 'in any resource type',
    }].concat(__hg_settings.types.resources.map(type => ({
      name: `in ${type}`, // todo: add translations / pluralize
      filter: `type=${type}`
    })))
  })
