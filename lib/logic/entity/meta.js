
async function getEntityMetadata(id) {
  return {
    type: 'human',
    isAmbiguousMatch: true,
    externalLinks: [
      {
        label: 'Wikidata',
        url: 'https://www.wikidata.org/wiki/Q769668'
      }
    ],
    thumbnailUrl: 'http://commons.wikimedia.org/wiki/Special:FilePath/Albert Einstein Head.jpg?width=80px',
    description: 'German-born physicist and founder of the theory of relativity',
    birth: {
      date: '1879-03-14T00:00:00Z',
      place: {
        label: {
          en: 'Ulm'
        },
        description: {
          en: 'city in Baden-Württemberg'
        },
        coordinates: {
          lat: 48.39841,
          lon: 9.99155
        },
        country: {
          code: 'de',
          label: {
            en: 'Germany'
          }
        }
      }
    },
    death: {
      date: '1955-04-18T00:00:00Z',
      place: {
        label: {
          en: 'Princeton'
        },
        description: {
          en: 'municipality in Mercer County, New Jersey'
        },
        coordinates: {
          lat: 40.352222222222,
          lon: -74.656944444444
        },
        country: {
          code: 'us',
          label: {
            en: 'United States of America'
          }
        }
      }
    },
    country: {
      code: 'lu',
      label: {
        en: 'Luxembourg'
      }
    }
  }
}

module.exports = {
  getEntityMetadata
}
