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

async function getFirstLine(filePath) {
  return new Promise((res, rej) => {
    try {
      const rl = readline.createInterface({
        input: fs.createReadStream(filePath)
      })
      let firstLine
      rl.on('line', line => {
        if (firstLine === undefined) {
          firstLine = line
          rl.close()
        }
      })
      rl.on('close', () => res(firstLine))
    } catch (e) {
      rej(e)
    }
  })
}

/* --- */

async function collectEntityTypeAndSlugToIdMapping(filePath, csvService) {
  return new Promise((res, rej) => {
    try {
      const rl = readline.createInterface({
        input: fs.createReadStream(filePath)
      })
      const mapping = {}
      let lineCount = 0
      rl.on('line', line => {
        if (lineCount === 0) {
          csvService.loadRulesFromHeader(line)
        } else {
          const item = csvService.parseLine(line)
          const key = typeAndSlugTag(item.properties, last(without(item.labels, 'entity')))
          mapping[key] = item.id
        }
        lineCount += 1
      })
      rl.on('close', () => res(mapping))
    } catch (e) {
      rej(e)
    }
  })
}

async function getLastTag(baseDir, type) {
  return new Promise((res, rej) => {
    fs.readdir(`${baseDir}/${type}`, (err, files) => {
      if (err) return rej(err)
      if (files.length === 0) return res()
      const tag = last(last(files.sort()).split('/')).replace(/\.csv$/, '')
      return res(tag)
    })
  })
}

function getFilePath(baseDir, type, tag) {
  if (tag === undefined) return undefined
  if (type === 'entity') return `${baseDir}/entity.csv`
  if (!fs.statSync(baseDir).isDirectory()) {
    fs.mkdirSync(`${baseDir}/${type}`)
  }

  return `${baseDir}/${type}/${tag}.csv`
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

  let entityMapping = collectEntityTypeAndSlugToIdMapping(getFilePath(baseDir, 'entity'), csvServices.entity)
  const fileTypes = ['resource', 'appears_in', 'version', 'describes']

  const lastIdsList = await Promise.all(fileTypes
    .map(async type => {
      const lastFilePathForType = getFilePath(baseDir, type, await getLastTag(baseDir, type))
      if (lastFilePathForType) {
        const header = getFirstLine(lastFilePathForType)
        csvServices[type].loadRulesFromHeader(header)
        const lastLine = getLastLine(lastFilePathForType)
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
  lastIds.entity = last(sortBy(values(entityMapping)))

  const lastTag = parseInt(await getLastTag(baseDir, 'resource'), 10)
  const tag = withLeadingZeros(lastTag + 1)

  const inputReadline = readline.createInterface({
    input: fs.createReadStream(payloadsPath)
  })

  const outputReadlines = fileTypes.map((acc, type) => {
    acc[type] = readline.createInterface({
      output: fs.createWriteStream(getFilePath(baseDir, type, tag))
    })
    return acc
  }, {})
  outputReadlines.entity = readline.createInterface({
    output: fs.createWriteStream(getFilePath(baseDir, 'entity'), { flags: 'a' })
  })

  let outputsClosedCounter = 0
  const outputsClosedPromise = new Promise()

  Object.keys(outputReadlines).forEach(type => {
    outputReadlines[type].on('close', () => {
      outputsClosedCounter += 1
      if (outputsClosedCounter === Object.keys(outputReadlines).length) {
        outputsClosedPromise.resolve()
      }
    })
  })

  const updateEntityMapping = m => { entityMapping = m }
  const updateLastIds = v => { lastIds = v }

  inputReadline.on('line', line => {
    const payload = JSON.parse(line)
    const result = createResourcePayloadListToEntitiesAndRelationships(
      [payload],
      entityMapping,
      lastIds
    )

    updateEntityMapping(result.entityTypeAndSlugToIdMapping)
    updateLastIds(result.lastIds)

    const { results } = result

    Object.keys(results).forEach(type => {
      results[type].forEach(item => {
        outputReadlines[type].write(csvServices[type].serializeItem(item))
      })
    })
  })

  inputReadline.on('close', () => {
    Object.keys(outputReadlines).forEach(type => outputReadlines[type].close())
  })

  return outputsClosedPromise
}

if (require.main === module) {
  const [, baseDir, payloadsFile] = process.argv
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
