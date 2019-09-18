/* eslint-env mocha */
const assert = require('assert')
const { slugify } = require('../../../lib/util/text')

describe('slugify', () => {
  it('works', () => {
    assert.equal(slugify('áÁrdvArçáЖ,x'), 'aardvarca-x')
  })
})
