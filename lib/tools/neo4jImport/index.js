const assert = require('assert')
const fs = require('fs')
const readline = require('readline')
const {
  fill, range, last, without,
  zip, sortBy, values, fromPairs
} = require('lodash')

const fsp = fs.promises

// eslint-disable-next-line no-console
const log = (...args) => console.log(...args)

const csvParserFactory = require('csv-parse')
const csvSerializerFactory = require('csv-stringify')

const csvParser = csvParserFactory()

const {
  createResourcePayloadListToEntitiesAndRelationships,
  typeAndSlugTag
} = require('./converters')

const { CsvService } = require('./csv')

function withLeadingZeros(v, n = 5) {
  const s = String(v)
  const zerosCount = n - s.length
  assert.ok(zerosCount >= 0, `Not enough zeros for ${s}`)
  return `${fill(range(zerosCount), 0).join('')}${s}`
}

async function ensureDirectoryExists(directoryPath) {
  try {
    const stats = await fsp.stat(directoryPath)
    if (!stats.isDirectory()) throw new Error(`Directory path "${directoryPath}" exists but is not a directory`)
    return directoryPath
  } catch (e) {
    if (e.code === 'ENOENT') {
      await fsp.mkdir(directoryPath)
      return directoryPath
    }
    throw e
  }
}

async function fileExists(path) {
  if (path === undefined) return false
  try {
    const stats = await fsp.stat(path)
    if (!stats.isFile()) throw new Error(`File "${path}" exists but is not a file`)
    return true
  } catch (e) {
    if (e.code === 'ENOENT') return false
    throw e
  }
}

async function getFilePath(baseDir, type, tag) {
  if (type === 'entity') return `${baseDir}/entity.csv`
  if (tag === undefined) return undefined

  const dir = await ensureDirectoryExists(`${baseDir}/${type}`)
  return `${dir}/${tag}.csv`
}

async function getLastRow(filePath) {
  return new Promise((resolve, reject) => {
    let lastRow
    fs.createReadStream(filePath)
      .pipe(csvParser)
      .on('data', d => { lastRow = d })
      .on('end', () => resolve(lastRow))
      .on('error', reject)
  })
}

async function getHeader(baseDir, type) {
  const dir = await ensureDirectoryExists(`${baseDir}/headers`)
  const filePath = `${dir}/${type}.csv`
  if (!await fileExists(filePath)) return undefined

  return new Promise((resolve, reject) => {
    const data = []
    fs.createReadStream(filePath)
      .pipe(csvParser)
      .on('data', d => data.push(d))
      .on('end', () => resolve(data[0]))
      .on('error', e => reject(e))
  })
}

async function saveHeader(baseDir, type, header) {
  const dir = await ensureDirectoryExists(`${baseDir}/headers`)
  const filePath = `${dir}/${type}.csv`

  return new Promise((resolve, reject) => {
    const serializer = csvSerializerFactory()
    const stream = serializer
      .pipe(fs.createWriteStream(filePath))
      .on('finish', resolve)
      .on('error', reject)

    serializer.write(header)
    serializer.end()
  })
}

async function collectEntityTypeAndSlugToIdMapping(baseDir, csvService) {
  const filePath = await getFilePath(baseDir, 'entity')

  const header = await getHeader(baseDir, 'entity')
  if (header) csvService.loadRulesFromHeader(header)

  if (!await fileExists(filePath)) return {}

  return new Promise((resolve, reject) => {
    const mapping = {}
    fs.createReadStream(filePath)
      .pipe(csvParser)
      .on('data', row => {
        const item = csvService.parseRow(row)
        const key = typeAndSlugTag(item.properties, last(without(item.labels, 'entity')))
        if (mapping[key] !== undefined) {
          log(`[WARNING] Clash: ${key} exists. Old data: ${mapping[key]}. New data: ${[item.id, item.properties.uuid]}`)
        }
        mapping[key] = [item.id, item.properties.uuid]
      })
      .on('end', () => resolve(mapping))
      .on('error', e => reject(e))
  })
}

async function getLastTag(baseDir, type) {
  const path = await ensureDirectoryExists(`${baseDir}/${type}`)
  const files = await fsp.readdir(path)

  if (files.length === 0) return undefined

  const tag = last(last(files.sort()).split('/')).replace(/\.csv$/, '')
  return tag
}

const getJsonSchemaUri = type => `http://c2dh.uni.lu/histograph/db/${type}.json`

async function main(baseDir, payloadsPath) {
  assert(fs.statSync(baseDir).isDirectory(), `"${baseDir}" directory not found`)

  const csvServices = {
    resource: new CsvService(getJsonSchemaUri('resource')),
    entity: new CsvService(getJsonSchemaUri('entity')),
    appears_in: new CsvService(getJsonSchemaUri('appears_in')),
    version: new CsvService(getJsonSchemaUri('version')),
    describes: new CsvService(getJsonSchemaUri('describes')),
  }

  let entityMapping = await collectEntityTypeAndSlugToIdMapping(baseDir, csvServices.entity)
  log(`Loaded ${Object.keys(entityMapping).length} items in entity mapping`)

  const fileTypes = ['resource', 'appears_in', 'version', 'describes']

  const lastIdsList = await Promise.all(fileTypes
    .map(async type => {
      const header = await getHeader(baseDir, type)
      if (header !== undefined) csvServices[type].loadRulesFromHeader(header)

      const lastFilePathForType = await getFilePath(baseDir, type, await getLastTag(baseDir, type))
      if (await fileExists(lastFilePathForType)) {
        const lastRow = await getLastRow(lastFilePathForType)
        const item = csvServices[type].parseRow(lastRow)
        return item.id
      }
      return 0
    }))

  let lastIds = zip(fileTypes, lastIdsList).reduce((acc, [type, id]) => {
    if (id !== undefined) {
      acc[type] = id
    }
    return acc
  }, {})
  lastIds.entity = last(sortBy(values(entityMapping).map(x => x[0])))

  const lastTag = parseInt(await getLastTag(baseDir, 'resource') || 0, 10)
  const tag = withLeadingZeros(lastTag + 1)
  log(`Current tag for files: ${tag}`)

  const inputReadline = readline.createInterface({
    input: fs.createReadStream(payloadsPath)
  })

  const outputStreams = fromPairs(await Promise.all(fileTypes.map(async type => {
    const serializer = csvSerializerFactory()
    const stream = serializer
      .pipe(fs.createWriteStream(await getFilePath(baseDir, type, tag)))
    return [type, [serializer, stream]]
  })))

  const serializer = csvSerializerFactory()
  const stream = serializer
    .pipe(fs.createWriteStream(await getFilePath(baseDir, 'entity'), { flags: 'a', emitClose: true }))
  outputStreams.entity = [serializer, stream]

  let outputsClosedCounter = 0
  const outputsClosedPromise = new Promise(res => {
    Object.keys(outputStreams).forEach(type => {
      outputStreams[type][1].on('finish', () => {
        outputsClosedCounter += 1
        if (outputsClosedCounter === Object.keys(outputStreams).length) {
          res()
        }
      })
    })
  })


  const updateEntityMapping = m => { entityMapping = m }
  const updateLastIds = v => { lastIds = v }

  let inputLineCounter = 0
  let s = process.hrtime()
  // eslint-disable-next-line no-restricted-syntax
  for await (const line of inputReadline) {
    const payload = JSON.parse(line)
    const result = createResourcePayloadListToEntitiesAndRelationships(
      [payload],
      entityMapping,
      lastIds,
      true
    )

    updateEntityMapping(result.entityTypeAndSlugToIdMapping)
    updateLastIds(result.lastIds)

    const { results } = result

    Object.keys(results).forEach(type => {
      results[type]
        .map(item => csvServices[type].serializeItem(item))
        .forEach(item => outputStreams[type][0].write(item))
    })

    inputLineCounter += 1
    if (inputLineCounter % 1000 === 0) {
      await Promise.all(Object.keys(csvServices).map(async serviceName => {
        const header = csvServices[serviceName].serializeHeader()
        return saveHeader(baseDir, serviceName, header)
      }))

      const used = process.memoryUsage().heapUsed / 1024 / 1024
      const e = process.hrtime(s)
      log(`${inputLineCounter} lines processed. Memory used: ${used} Mb. Took ${e} s. Entities: ${Object.keys(entityMapping).length}`)
      s = process.hrtime()
    }
  }
  Object.keys(outputStreams).forEach(type => outputStreams[type][1].end())
  await Promise.all(Object.keys(csvServices).map(async serviceName => {
    const header = csvServices[serviceName].serializeHeader()
    return saveHeader(baseDir, serviceName, header)
  }))

  return outputsClosedPromise
}

if (require.main === module) {
  const [,, baseDir, payloadsFile] = process.argv
  log(`Working with base dir "${baseDir}" and payloads file "${payloadsFile}"`)
  main(baseDir, payloadsFile)
    .then(() => {
      log('Done')
      process.exit(0)
    })
    .catch(e => {
      log(`Error occurred: ${e.stack}`)
      process.exit(1)
    })
}
