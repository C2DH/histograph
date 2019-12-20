const { readFileSync } = require('fs')
const { GraphQLJSONObject } = require('graphql-type-json')
const { GraphQLDateTime } = require('graphql-iso-date')
const resource = require('./neo4j/resource')

const typeDefs = readFileSync(`${__dirname}/schema.graphql`).toString()

const resolvers = {
  LanguageContextStringField: GraphQLJSONObject,
  GraphQLDateTime,
  Query: {
    resourceFindRecommendedResourcesFor: resource.findRecommendedResourcesFor
  }
}

module.exports = {
  typeDefs,
  resolvers
}
