import _ from 'lodash'
import readline from 'readline'

/**
 * Helper class for keeping track of the progress and printing it
 */
export default class Progress {

  private formatters: any//object
  private stream: any//NodeJS.WriteStream | undefined
  private timer: any//NodeJS.Timeout | null
  private metricsPrinted: number

  /**
   * @constructor
   * @param {Object} [formatters=undefined] Formatters object
   * @param {Writeable} [stream=undefined] Stream to write process to, defaults to stderr
   */
  constructor (formatters: any = undefined, stream: any/*NodeJS.WriteStream | undefined*/ = undefined) {
    this.formatters = formatters ? _.cloneDeep(formatters) : {}
    this.stream = stream || process.stderr
    this.timer = null
    this.metricsPrinted = 0
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
    this.metricsPrinted = 0
    _.forOwn(this, (value: any, metric: string): void => {
      if (!this.isMetric(metric)) {
        return
      }

      const formatter = this.formatters[metric] || ((value: any) => `${metric} = ` + _.toString(value))

      readline.clearLine(this.stream, 0)
      this.stream.write(formatter(_.isNil(value) ? 0 : value) + '\n')
      this.metricsPrinted++
    })
  }

  /**
   * Iterative print
   */
  private iterativePrint (): void {
    (readline as any).cursorTo(this.stream, 0, null)
    readline.moveCursor(this.stream, 0, -this.metricsPrinted)
    this.print()
  }

  /**
   * Starts printing by timer
   */
  public start (interval: number = 10): void {
    if (this.timer !== null) {
      return
    }
    this.print()
    this.timer = setInterval(() => this.iterativePrint(), interval)
  }

  /**
   * Cancel printing by timer
   */
  public cancel (): void {
    if (this.timer === null) {
      return
    }
    clearInterval(this.timer)
    this.timer = null
    this.iterativePrint()
  }
}
