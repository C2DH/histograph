/* eslint-env mocha */
const assert = require('assert')
const { zip } = require('lodash')
const generateCsv = require('csv-stringify/lib/sync')

const {
  CsvService
} = require('../../../../lib/tools/neo4jImport/csv')
const { validPayload } = require('./converters.test')
const {
  createResourcePayloadToEntitiesAndRelationships
} = require('../../../../lib/tools/neo4jImport/converters')

describe('CsvService', () => {
  it('serializes resource correctly with header', () => {
    const result = createResourcePayloadToEntitiesAndRelationships(validPayload)
    const resources = result.resource
    const csvService = new CsvService('http://c2dh.uni.lu/histograph/db/resource.json')
    const csvLines = resources.map(r => csvService.serializeItem(r))
    const csvHeader = csvService.serializeHeader()

    assert.equal(csvLines.length, resources.length)

    const row = generateCsv([csvLines[0]])
    const stringRegex = '1,resource,about-foo,[^,]+,"Foo, Belval",text/plain,en,1546300800,2019-01-01T00:00:00Z,201901,2019,1546387199,2019-01-01T23:59:59Z,201901,2019,"Foo, Belval",A test page about Foo,"Content of a test page \n about Foo.",external-text,[^,]+,[^,]+,[^,]+,[^,]+'
    assert.ok(row.match(stringRegex), `"${row}" does not match "${stringRegex}"`)

    const expectedHeader = ':ID(resource),:LABEL,slug:string,uuid:string,name:string,mimetype:string,languages:string[],start_time:int,start_date:string,start_month:float,start_year:float,end_time:int,end_date:string,end_month:float,end_year:float,title_en:string,caption_en:string,content_en:string,type:string,creation_date:string,creation_time:int,last_modification_date:string,last_modification_time:int'
    assert.equal(csvHeader, expectedHeader)
  })

  it('serializes appears_in correctly with header', () => {
    const result = createResourcePayloadToEntitiesAndRelationships(validPayload)
    const appearances = result.appears_in
    const csvService = new CsvService('http://c2dh.uni.lu/histograph/db/appears_in.json')
    const csvLines = appearances.map(r => csvService.serializeItem(r))
    const csvHeader = csvService.serializeHeader()

    assert.equal(csvLines.length, appearances.length)

    const expectedStringRegexes = [
      /1,1,appears_in,2,en,,0,0,[^,]+,[^,]+,[^,]+,[^,]+/,
      /2,1,appears_in,1,en,,0,0,[^,]+,[^,]+,[^,]+,[^,]+/,
    ]
    zip(csvLines, expectedStringRegexes)
      .forEach(([s, regex]) => {
        const row = generateCsv([s])
        assert.ok(row.match(regex), `"${row}" does not match "${regex}"`)
      })

    const expectedHeader = ':START_ID(entity),:END_ID(resource),:TYPE,frequency:int,languages:string[],upvote:string[],celebrity:int,score:int,creation_date:string,creation_time:int,last_modification_date:string,last_modification_time:int'
    assert.equal(csvHeader, expectedHeader)
  })

  it('parses resource', () => {
    const result = createResourcePayloadToEntitiesAndRelationships(validPayload)
    const resources = result.resource
    const csvService = new CsvService('http://c2dh.uni.lu/histograph/db/resource.json')
    const csvLines = resources.map(r => csvService.serializeItem(r))

    const parsedItems = csvLines.map(l => csvService.parseRow(l))
    assert.deepEqual(parsedItems, resources)
  })

  it('parses header', () => {
    const header = ':ID(resource),:LABEL,slug:string,uuid:string,name:string,mimetype:string,languages:string[]'.split(',')
    const csvService = new CsvService('http://c2dh.uni.lu/histograph/db/resource.json', header)
    assert.deepEqual(csvService.rules, [
      [undefined, 'ID', 'resource'],
      [undefined, 'LABEL', undefined],
      ['slug', 'string', undefined],
      ['uuid', 'string', undefined],
      ['name', 'string', undefined],
      ['mimetype', 'string', undefined],
      ['languages', 'string[]', undefined],
    ])
  })
})
