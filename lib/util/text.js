const { unzip, fromPairs, get } = require('lodash')
const shortid = require('shortid')

const NonAsciiCharactersReplacements = fromPairs(unzip([
  'àáäâèéëêìíïîòóöôùúüûñç',
  'aaaaeeeeiiiioooouuuunc'
].map(x => x.split(''))))

const slugify = text => text
  .toLowerCase()
  .split('')
  .map(c => get(NonAsciiCharactersReplacements, c, c))
  .join('')
  .replace(/[^a-z0-9]/g, '-')
  .replace(/-{1,}/g, '-')
  .replace(/-$/, '')
  .replace(/^-/, '')

const generateUuid = () => shortid.generate()

module.exports = {
  slugify,
  generateUuid
}
