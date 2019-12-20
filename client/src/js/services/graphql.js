import ApolloClient from 'apollo-client'
import { createHttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'

function graphqlClientFactory(HgSettings) {
  return new ApolloClient({
    link: createHttpLink({ uri: `${HgSettings.apiBaseUrl}/api/graphql` }),
    cache: new InMemoryCache()
  })
}

angular.module('histograph')
  .factory('GraphqlClient', graphqlClientFactory)
