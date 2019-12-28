import { toPairs, fromPairs } from 'lodash'
import gql from 'graphql-tag'

const arrayFilterKeys = ['with', 'without']

const sanitizedFilters = filters => fromPairs(toPairs(filters)
  .map(([key, value]) => {
    if (arrayFilterKeys.includes(key)) return [key, value.split(',')]
    return [key, value]
  }))

const Query = {
  recommendedResources: gql`
    query getRecommendedResources($uuid: ID!, $filters: ResourceFilters, $page: PageRequestDetails) {
      recommended: resourceFindRecommendedResourcesFor(uuid: $uuid, filters: $filters, page: $page) {
        resources {
          uuid
          title
          caption
          slug
          name
          start_date
          end_date
          type
          iiif_url
        }
        info {
          total
        }
      }
    }
  `
}

class ResourceService {
  constructor(client) {
    this.client = client
  }

  findRecommendedResourcesFor(resourceUuid, filters, offset = 0, limit = 50) {
    const variables = {
      uuid: resourceUuid,
      filters: sanitizedFilters(filters),
      page: { offset, limit }
    }
    return this.client.query({
      query: Query.recommendedResources,
      variables
    })
  }
}

angular.module('histograph')
  .factory('ResourceService', function serviceFactory(GraphqlClient) {
    return new ResourceService(GraphqlClient)
  })
