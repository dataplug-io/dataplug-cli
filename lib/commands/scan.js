const _ = require('lodash')
const Ajv = require('ajv')
const chalk = require('chalk')
const Promise = require('bluebird')
const { Scanner } = require('@dataplug/dataplug')
const { JsonStreamReader } = require('@dataplug/dataplug-json')
const Progress = require('../progress')

let declaration = {
  command: 'scan',
  description: 'Scans collection data stream from stdin and output results'
}
declaration.builder = (yargs) => yargs
  .option('indent', {
    alias: 'i',
    describe: 'Prettify output JSON using given amount of spaces',
    type: 'integer'
  })
  .coerce('indent', value => {
    value = Number.parseInt(value)
    return _.isNaN(value) ? undefined : value
  })
  .option('results', {
    alias: 'o',
    describe: 'Print the results in machine-readable format'
  })
  .option('progress', {
    alias: 'p',
    describe: 'Show progress in console'
  })
  .option('invert', {
    alias: 'r',
    describe: 'Invert valid and invalid meaning',
    type: 'boolean',
    default: false
  })
  .option('fail', {
    alias: 'f',
    describe: 'Fail on invalid data with failure'
  })
declaration.prerequisites = (collection) => {
  return collection.schema
}
declaration.handler = (argv, collection) => {
  const validator = new Ajv({
    useDefaults: true,
    allErrors: false
  }).compile(collection.schema)
  const progress = !argv.progress ? null : new Progress({
    scanned: (value) => chalk.yellow('?') + ` scanned: ${value}`,
    valid: (value) => chalk.green('✓') + ` valid: ${value}`,
    invalid: (value) => chalk.red('✗') + ` invalid: ${value}`
  })
  if (progress) {
    progress.scanned =
      progress.valid =
      progress.invalid = 0
    progress.start()
  }

  const reader = new JsonStreamReader()
  const scanner = new Scanner((data) => {
    let result = validator(data)
    if (argv.invert) {
      result = !result
    }

    if (progress) {
      progress.scanned += 1
      if (result) {
        progress.valid += 1
      } else {
        progress.invalid += 1
      }
    }

    if (!result && argv.fail) {
      throw new Error(JSON.stringify(validator.errors))
    }
  })

  process.on('SIGINT', function () {
    process.stdin.unpipe()
  })

  new Promise((resolve, reject) => {
    process.stdin
      .pipe(reader)
      .on('error', (error) => {
        reject('Failed to deserialize data as JSON: ' + error ? error : 'no specific information')
      })
      .pipe(scanner)
      .on('error', (error) => {
        reject('Failed to process data: ' + error ? error : 'no specific information')
      })
      .on('finish', () => {
        resolve()
      })
      .resume()
  })
    .then(() => {
      if (progress) {
        progress.cancel()
      }

      if (argv.results) {
        const space = argv.indent ? _.repeat(' ', argv.indent) : null
        const results = progress.getMetrics()
        process.stdout.write(JSON.stringify(results, null, space))
      }
    })
    .catch((error) => {
      if (progress) {
        progress.cancel()
      }
      console.error(chalk.red('!'), error || 'Unknown error')
      process.exit(70)
    })
}

module.exports = declaration
