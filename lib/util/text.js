const { unzip, fromPairs, get } = require('lodash')
const shortid = require('shortid')
const crypto = require('crypto')

const NonAsciiCharactersReplacements = fromPairs(unzip([
  'àáäâèéëêìíïîòóöôùúüûñç',
  'aaaaeeeeiiiioooouuuunc'
].map(x => x.split(''))))

const getHash = text => crypto.createHash('md5').update(text).digest('hex')

function slugify(text, maxLength = 256) {
  const slug = text
    .toLowerCase()
    .split('')
    .map(c => get(NonAsciiCharactersReplacements, c, c))
    .join('')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-{1,}/g, '-')
    .replace(/-$/, '')
    .replace(/^-/, '')

  if (slug.length <= maxLength) return slug
  return getHash(slug)
}

const generateUuid = () => shortid.generate()

module.exports = {
  slugify,
  generateUuid
}
