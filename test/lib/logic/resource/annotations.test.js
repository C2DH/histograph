/* eslint-env mocha */
const assert = require('assert')
const {
  addAnnotations
} = require('../../../../lib/logic/resource/annotations')


describe('addAnnotations', () => {
  it('annotates text fields', () => {
    const testResource = {
      title: {
        en: 'About Robert Schuman'
      },
      caption: {
        en: 'A Wikipedia article about Robert Schuman'
      },
      content: {
        en: 'Robert Schuman was a Luxembourg-born German-French statesman.'
      },
      languages: ['en']
    }
    const entityAndAppearanceList = [
      {
        entity: {
          uuid: 'abc123',
          name: 'Robert Schuman'
        },
        appearance: {
          languages: ['en'],
          context: {
            en: [[6, 20], [48, 62], [64, 78]]
          }
        }
      },
      {
        entity: {
          uuid: 'def456',
          name: 'Luxembourg'
        },
        appearance: {
          languages: ['en'],
          context: {
            en: [[85, 95]]
          }
        }
      },
    ]
    const expertedResult = {
      title: {
        en: 'About [Robert Schuman](abc123)'
      },
      caption: {
        en: 'A Wikipedia article about [Robert Schuman](abc123)'
      },
      content: {
        en: '[Robert Schuman](abc123) was a [Luxembourg](def456)-born German-French statesman.'
      },
      languages: ['en']
    }

    const result = addAnnotations(testResource, entityAndAppearanceList)
    assert.deepEqual(result, expertedResult)
  })

  it('annotates text fields with only one of them containing an entity', () => {
    const testResource = {
      title: {
        en: 'About Robert Schuman'
      },
      caption: {
        en: 'A Wikipedia article about Robert Schuman'
      },
      content: {
        en: 'Robert Schuman was a Luxembourg-born German-French statesman.'
      },
      languages: ['en']
    }
    const entityAndAppearanceList = [
      {
        entity: {
          uuid: 'abc123',
          name: 'Robert Schuman'
        },
        appearance: {
          languages: ['en'],
          context: {
            en: [[6, 20]]
          }
        }
      }
    ]
    const expertedResult = {
      title: {
        en: 'About [Robert Schuman](abc123)'
      },
      caption: {
        en: 'A Wikipedia article about Robert Schuman'
      },
      content: {
        en: 'Robert Schuman was a Luxembourg-born German-French statesman.'
      },
      languages: ['en']
    }

    const result = addAnnotations(testResource, entityAndAppearanceList)
    assert.deepEqual(result, expertedResult)
  })
})
