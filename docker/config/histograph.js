module.exports = {
  neo4j: {
    host: {
      // Both 'server' (old) and 'uri' (new) connection methods
      // are still used
      server: 'http://neo4j:7474',
      uri: 'bolt://neo4j:7687',
      user: 'neo4j',
      pass: 'neo4jpwd'
    }
  },
  paths: {
    media: './contents/media',
    txt: './contents/txt',
    cache: {
      disambiguation: './contents/cache/disambiguation',
      dbpedia: './contents/cache/dbpedia',
      queries: './contents/cache/queries',
      services: './contents/cache/services',
    }
  },
  actions: {
    // minimum votes required for actions to be executed
    votingThreshold: 1,
  },
  bucketOfExplorables: {
    // Available aspects in Bucket of Explorables view (none by default)
    availableAspects: [
      'keywordPresenceFrequency',
      'nationalsMentionFrequency',
      'topicModellingScores'
    ]
  },
  // optional Google analytics account
  analytics: {
    // account: 'UA-XXXXXXXXX-1',
    domainName: 'none'
  },
  // Obsolete
  disambiguation: {
    geoservices: {
      geonames: ['en', 'fr', 'de', 'nl'],
      geocoding: ['en', 'fr', 'de', 'nl']
    }
  },
  types: {
    resources: [
      'external-text',
      'picture',
      'press',
      'video',
      'cartoon',
      'facts',
      'letter',
      'facsimile',
      'treaty',
      'sound',
      'table',
      'article',
      'schema',
      'map',
      'graphical-table',
      'scientific-contribution',
      'passport'
    ],
    entity: [
      'theme',
      'location',
      'place',
      'person'
    ],
    // precompute jaccard distance for these
    // entities only (create appear_in_same_document neo4j links)
    jaccard: [
      'theme',
      'person'
    ]
  },
  languages: ['en', 'fr', 'de'],

  c2dhnerd: {
    endpoint: 'http://localhost:8002'
  },
  wikidata: {
    entity: {
      endpoint: 'https://www.wikidata.org/wiki/Special:EntityData/'
    }
  },
  geonames: {
    endpoint: 'http://api.geonames.org/searchJSON',
    username: 'histograph'
  }
}
