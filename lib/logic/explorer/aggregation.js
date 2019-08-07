const assert = require('assert')
const {
  isEmpty, isNil, isNumber, chunk,
  first, last, isArray, range
} = require('lodash')

function aggregateArrays(values, fn) {
  const arrayLength = first(values).length
  return range(0, arrayLength).map(i => {
    const vector = values.map(v => v[i])
    return fn(vector)
  })
}

function aggregateScalars(values, fn) {
  return fn(values)
}

/**
 *
 * @param {array} items a list of items to aggregate
 * @param {*} binsCount aggregate items into this number of bins
 * @param {*} valueFn function applied to every item to extract value to be aggregated.
 *                    Value can be an array.
 * @param {*} aggregationFn function to aggregate values (e.g. mean or max)
 * @return a list of aggregated items:
 * {
 *    firstItem: <first item from the items list>,
 *    lastItem: <last item from the items list>,
 *    value: <aggregated value>,
 *    itemsCount: N
 * }
 */
function aggregate(items, binsCount, valueFn, aggregationFn) {
  if (isEmpty(items)) return []

  let finalBinsCount = isNil(binsCount)
    ? items.length
    : binsCount
  finalBinsCount = isNil(binsCount) || binsCount > items.length
    ? items.length
    : binsCount
  assert(isNumber(finalBinsCount), `Bins count must be a number: ${binsCount}`)

  const itemsCountPerBin = Math.ceil(items.length / finalBinsCount)
  const chunkedItems = chunk(items, itemsCountPerBin)

  return chunkedItems.map(binItems => {
    const [firstItem, lastItem] = [first(binItems), last(binItems)]
    const values = binItems.map(valueFn)

    const value = isArray(first(values))
      ? aggregateArrays(values, aggregationFn)
      : aggregateScalars(values, aggregationFn)

    return {
      firstItem,
      lastItem,
      value,
      itemsCount: values.length
    }
  })

}

module.exports = {
  aggregate
}
