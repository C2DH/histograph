/* eslint-env mocha */
const assert = require('assert')
const { range } = require('lodash')
const { slugify } = require('../../../lib/util/text')

describe('slugify', () => {
  it('works', () => {
    assert.equal(slugify('áÁrdvArçáЖ,x'), 'aardvarca-x')
  })

  it('returns hash for strings longer than 256 characters', () => {
    const text = range(0, 100).map(i => `Text ${i}`).join(' ')
    assert.equal(slugify(text), '7fe462f1d9c45d001e74b4edf315c41e')
  })
})
