// Code below modified from https://github.com/pgte/moving-average
const exp = Math.exp
module.exports = function MovingAverage (timespan) {
  if (timespan <= 0) {
    throw new Error('Moving average: timespan required')
  }

  let ma // moving average
  let v = 0 // variance
  let d = 0 // deviation
  let diff // last change

  let previousTime

  let ret = {}

  function alpha (t, pt) {
    return 1 - (exp(-(t - pt) / timespan))
  }

  ret.push =
    function push (time, value) {
      if (previousTime) {
        // calculate moving average
        const a = alpha(time, previousTime)
        diff = value - ma
        const incr = a * diff
        ma = a * value + (1 - a) * ma
        // calculate variance & deviation
        v = (1 - a) * (v + diff * incr)
        d = Math.sqrt(v)
        // calculate forecast
        // f = ma + a * diff
      } else {
        ma = value
      }
      previousTime = time
      return ma
    }

  // Exponential Moving Average

  ret.movingAverage =
    function movingAverage () {
      return ma
    }

  // Variance
  ret.variance =
    function variance () {
      return v
    }

  ret.deviation =
    function deviation () {
      return d
    }

  ret.forecast =
    function forecast (time) {
      const a = alpha(time, previousTime)
      return ma + a * diff
    }

  return ret
}
