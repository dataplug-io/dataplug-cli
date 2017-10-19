const _ = require('lodash');
const readline = require('readline');

/**
 * Helper class for keeping track of the progress and printing it
 */
class Progress {
  /**
   * @constructor
   * @param {Object} formatters
   */
  constructor(formatters) {
    this._formatters = _.cloneDeep(formatters);
    this._timer = null;
  }

  /**
   * Prints current status
   */
  print() {
    for (let metric in this) {
      if (metric === '_formatters' || metric === '_timer') {
        continue;
      }

      const formatter = this._formatters[metric] || ((value) => _.toString(value));

      readline.clearLine(process.stderr, 0);
      process.stderr.write(formatter(this[metric] || 0) + '\n');
    }
  }

  /**
   * Iterative print
   */
  _iterativePrint() {
    readline.cursorTo(process.stderr, 0, null);
    readline.moveCursor(process.stderr, 0, -(_.keys(this).length - 2));
    this.print();
  }

  /**
   * Starts printing by timer
   */
  start(interval = 10) {
    if (this._timer !== null) {
      return;
    }
    this.print();
    this._timer = setInterval(() => this._iterativePrint(), interval);
  }

  /**
   * Cancel printing by timer
   */
  cancel() {
    if (this._timer === null) {
      return;
    }
    clearInterval(this._timer);
    this._timer = null;
    this._iterativePrint();
  }
};

module.exports = Progress;
