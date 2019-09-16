const assert = require('assert')
const fs = require('fs')
const readline = require('readline')
const {
  fill, range, last, without,
  zip, sortBy, values,
} = require('lodash')

// eslint-disable-next-line no-console
const log = (...args) => console.log(...args)

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

async function getLastLine(filePath) {
  return new Promise((res, rej) => {
    try {
      const rl = readline.createInterface({
        input: fs.createReadStream(filePath)
      })
      let lastLine
      rl.on('line', line => { lastLine = line })
      rl.on('close', () => res(lastLine))
    } catch (e) {
      rej(e)
    }
  })
}

/* --- */

function fileExists(path) {
  if (path === undefined) return false
  try {
    return fs.statSync(path).isFile()
  } catch (e) {
    if (e.code === 'ENOENT') return false
    throw e
  }
}

async function getHeader(baseDir, type) {
  const dir = `${baseDir}/headers`
  try {
    fs.statSync(dir)
  } catch (e) {
    if (e.code === 'ENOENT') fs.mkdirSync(dir)
    else throw e
  }

  const filePath = `${dir}/${type}.csv`
  if (!fileExists(filePath)) return undefined

  return new Promise((res, rej) => fs.readFile(filePath, (err, data) => {
    if (err) return rej(err)
    return res(data.toString())
  }))
}

async function saveHeader(baseDir, type, header) {
  const dir = `${baseDir}/headers`
  try {
    fs.statSync(dir)
  } catch (e) {
    if (e.code === 'ENOENT') fs.mkdirSync(dir)
    else throw e
  }

  const filePath = `${dir}/${type}.csv`

  return new Promise((res, rej) => fs.writeFile(filePath, header, err => {
    if (err) return rej(err)
    return res()
  }))
}

async function collectEntityTypeAndSlugToIdMapping(baseDir, filePath, csvService) {
  if (!fileExists(filePath)) return {}

  const header = await getHeader(baseDir, 'entity')
  if (header) csvService.loadRulesFromHeader(header)

  return new Promise((res, rej) => {
    try {
      const rl = readline.createInterface({
        input: fs.createReadStream(filePath)
      })
      const mapping = {}
      rl.on('line', line => {
        const item = csvService.parseLine(line)
        const key = typeAndSlugTag(item.properties, last(without(item.labels, 'entity')))
        if (mapping[key] !== undefined) {
          log(`Clash: ${key} exists. Old data: ${mapping[key]}. New data: ${[item.id, item.properties.uuid]}`)
        }
        mapping[key] = [item.id, item.properties.uuid]
      })
      rl.on('close', () => res(mapping))
    } catch (e) {
      rej(e)
    }
  })
}

async function getLastTag(baseDir, type) {
  const path = `${baseDir}/${type}`
  return new Promise((res, rej) => {
    try {
      fs.statSync(path)
    } catch (e) {
      if (e.code === 'ENOENT') return res()
      return rej(new Error(e.message))
    }

    return fs.readdir(path, (err, files) => {
      if (err) return rej(new Error(err.message))
      if (files.length === 0) return res()
      const tag = last(last(files.sort()).split('/')).replace(/\.csv$/, '')
      return res(tag)
    })
  })
}

function getFilePath(baseDir, type, tag) {
  if (type === 'entity') return `${baseDir}/entity.csv`
  if (tag === undefined) return undefined

  const dir = `${baseDir}/${type}`
  try {
    fs.statSync(dir)
  } catch (e) {
    if (e.code === 'ENOENT') fs.mkdirSync(dir)
    else throw e
  }

  return `${dir}/${tag}.csv`
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

  let entityMapping = await collectEntityTypeAndSlugToIdMapping(baseDir, getFilePath(baseDir, 'entity'), csvServices.entity)
  log(`Loaded ${Object.keys(entityMapping).length} items in entity mapping`)
  const fileTypes = ['resource', 'appears_in', 'version', 'describes']

  const lastIdsList = await Promise.all(fileTypes
    .map(async type => {
      const header = await getHeader(baseDir, type)
      if (header !== undefined) csvServices[type].loadRulesFromHeader(header)

      const lastFilePathForType = getFilePath(baseDir, type, await getLastTag(baseDir, type))
      if (fileExists(lastFilePathForType)) {
        const lastLine = await getLastLine(lastFilePathForType)
        const item = csvServices[type].parseLine(lastLine)
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

  const outputStreams = fileTypes.reduce((acc, type) => {
    acc[type] = fs.createWriteStream(getFilePath(baseDir, type, tag))
    return acc
  }, {})
  outputStreams.entity = fs.createWriteStream(getFilePath(baseDir, 'entity'), { flags: 'a', emitClose: true })

  let outputsClosedCounter = 0
  const outputsClosedPromise = new Promise(res => {
    Object.keys(outputStreams).forEach(type => {
      outputStreams[type].on('close', () => {
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
      results[type].forEach(item => {
        outputStreams[type].write(`${csvServices[type].serializeItem(item)}\n`)
      })
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
  Object.keys(outputStreams).forEach(type => outputStreams[type].end())

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
