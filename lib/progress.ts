import _ from 'lodash'
import readline from 'readline'

/**
 * Helper class for keeping track of the progress and printing it
 */
export default class Progress {

  private _formatters: object
  private _stream: NodeJS.WritableStream
  private _timer: NodeJS.Timeout | null
  private _metricsPrinted: number

  /**
   * @constructor
   * @param {Object} [formatters=undefined] Formatters object
   * @param {Writeable} [stream=undefined] Stream to write process to, defaults to stderr
   */
  constructor (formatters: object | undefined = undefined, stream: NodeJS.WriteStream = process.stderr) {
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
  public isMetric (key: string): boolean {
    return key.length > 1 && key.charAt(0) !== '_' && this.hasOwnProperty(key)
  }

  /**
   * Gets metrics
   * @return {Object} Object with metrics
   */
  public getMetrics (): any {
    return _.pickBy(this, (value: any, key: string) => this.isMetric(key))
  }

  /**
   * Prints current status
   */
  public print (): void {
    this._metricsPrinted = 0
    _.forOwn(this, (value: any, metric: string): void => {
      if (!this.isMetric(metric)) {
        return
      }

      const formatter = this._formatters[metric] || ((value: any): string => `${metric} = ` + _.toString(value))

      readline.clearLine(this._stream, 0)
      this._stream.write(formatter(_.isNil(value) ? 0 : value) + '\n')
      this._metricsPrinted++
    })
  }

  /**
   * Iterative print
   */
  private iterativePrint (): void {
    (readline as any).cursorTo(this._stream, 0, null)
    readline.moveCursor(this._stream, 0, -this._metricsPrinted)
    this.print()
  }

  /**
   * Starts printing by timer
   */
  public start (interval: number = 10): void {
    if (this._timer !== null) {
      return
    }
    this.print()
    this._timer = setInterval(() => this.iterativePrint(), interval)
  }

  /**
   * Cancel printing by timer
   */
  public cancel (): void {
    if (this._timer === null) {
      return
    }
    clearInterval(this._timer)
    this._timer = null
    this.iterativePrint()
  }
}
