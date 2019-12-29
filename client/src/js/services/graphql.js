import ApolloClient from 'apollo-client'
import { createHttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { ApolloLink, concat } from 'apollo-link'

function graphqlClientFactory(HgSettings, AuthService) {

  const httpLink = createHttpLink({ uri: `${HgSettings.apiBaseUrl}/api/graphql` })
  const authMiddleware = new ApolloLink((operation, forward) => {
    operation.setContext({
      headers: {
        authorization: AuthService.getAccessToken()
          ? `Bearer ${AuthService.getAccessToken()}`
          : null,
      }
    })
    return forward(operation)
  })

  return new ApolloClient({
    link: concat(authMiddleware, httpLink),
    cache: new InMemoryCache(),
    defaultOptions: {
      query: {
        fetchPolicy: 'no-cache',
        errorPolicy: 'all',
      }
    }
  })
}

angular.module('histograph')
  .factory('GraphqlClient', graphqlClientFactory)
