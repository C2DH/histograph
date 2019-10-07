const assert = require('assert')
const moment = require('moment')

function toUnixSeconds(timeString, setTimeToMaximum = false) {
  const time = moment.utc(timeString)
  assert(time.isValid(), `Invalid time string: "${timeString}"`)

  if (setTimeToMaximum) {
    time.endOf('day')
  }

  return Math.floor(time.valueOf() / 1000)
}

/*
  Transform a date in the current db format and return a dict of date and time
  @date   - string e.g "1921-11-27"
  @format - the parser e.g "MM-DD-YYYY"
  @next [optional] - callback. if it is not provided, send back the result.
*/
function reconcileDate(date, format, next) {
  const d = moment.utc(date, format)
  const result = {
    date: d.format(),
    time: +d.format('X')
  }
  if (next) return next(null, result)
  return result
}

/*
  Get months for timeline.
  @Return a dictionary of strings
*/
function getMonths(startTime, endTime) {
  return {
    start_month: moment.utc(startTime, 'X').format('YYYYMM'),
    end_month: moment.utc(endTime, 'X').format('YYYYMM'),
    start_year: moment.utc(startTime, 'X').format('YYYY'),
    end_year: moment.utc(endTime, 'X').format('YYYY')
  }
}

module.exports = {
  toUnixSeconds,
  reconcileDate,
  getMonths
}
