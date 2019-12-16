function entityService($resource, HgSettings) {
  const url = `${HgSettings.apiBaseUrl}/api/entity/:id/:aspect`
  return $resource(url, null, {
    getMeta: { method: 'GET', params: { aspect: 'meta' }, isArray: false }
  })
}

angular.module('histograph').factory('EntityService', entityService)
