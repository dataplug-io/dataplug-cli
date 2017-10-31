const _ = require('lodash')
const readline = require('readline')

/**
 * Helper class for keeping track of the progress and printing it
 */
class Progress {
  /**
   * @constructor
   * @param {Object} [formatters=undefined] Formatters object
   * @param {Writeable} [stream=undefined] Stream to write process to, defaults to stderr
   */
  constructor (formatters = undefined, stream = undefined) {
    this._formatters = formatters ? _.cloneDeep(formatters) : {}
    this._stream = stream || process.stderr
    this._timer = null
    this._metricsPrinted = 0
  }

  /**
   * Checks if key is metric
   *
   * @param {string} key Metric key
   * @return {boolean} True if key identifies a metric
   */
  isMetric (key) {
    return key && key.length > 1 && key.charAt(0) !== '_' && this.hasOwnProperty(key)
  }

  /**
   * Gets metrics
   * @return {Object} Object with metrics
   */
  getMetrics () {
    return _.pickBy(this, (value, key) => this.isMetric(key))
  }

  /**
   * Prints current status
   */
  print () {
    this._metricsPrinted = 0
    _.forOwn(this, (value, metric) => {
      if (!value) {
        return
      }

      const formatter = this._formatters[metric] || ((value) => `${metric} = ` + _.toString(value))

      readline.clearLine(this._stream, 0)
      this._stream.write(formatter(_.isNil(value) ? 0 : value) + '\n')
      this._metricsPrinted++
    })
  }

  /**
   * Iterative print
   */
  _iterativePrint () {
    readline.cursorTo(this._stream, 0, null)
    readline.moveCursor(this._stream, 0, -this._metricsPrinted)
    this.print()
  }

  /**
   * Starts printing by timer
   */
  start (interval = 10) {
    if (this._timer !== null) {
      return
    }
    this.print()
    this._timer = setInterval(() => this._iterativePrint(), interval)
  }

  /**
   * Cancel printing by timer
   */
  cancel () {
    if (this._timer === null) {
      return
    }
    clearInterval(this._timer)
    this._timer = null
    this._iterativePrint()
  }
};

module.exports = Progress
