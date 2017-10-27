const _ = require('lodash')
const Ajv = require('ajv')
const chalk = require('chalk')
const { Scanner } = require('@dataplug/dataplug')
const { JsonStreamReader } = require('@dataplug/dataplug-json')
const { printJson, printErrorAndExit } = require('../command')
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
  if (!collection.schema) {
    printErrorAndExit(`'${collection.name}' collection does not have a schema`)
    return
  }

  const validator = new Ajv({
    useDefaults: true,
    allErrors: false
  }).compile(collection.schema)
  const progress = new Progress({
    scanned: (value) => chalk.yellow('?') + ` scanned: ${value}`,
    valid: (value) => chalk.green('✓') + ` valid: ${value}`,
    invalid: (value) => chalk.red('✗') + ` invalid: ${value}`
  })
  progress.scanned =
    progress.valid =
    progress.invalid = 0
  if (argv.progress) {
    progress.start()
  }

  const reader = new JsonStreamReader()
  const scanner = new Scanner((data) => {
    let result = validator(data)
    if (argv.invert) {
      result = !result
    }

    progress.scanned += 1
    if (result) {
      progress.valid += 1
    } else {
      progress.invalid += 1
    }

    if (!result && argv.fail) {
      throw new Error(JSON.stringify(validator.errors))
    }
  })
  scanner.on('pipe', (source) => {
    process.on('SIGINT', function () {
      source.unpipe(scanner)
      scanner.end()
    })
  })

  process.stdin
    .pipe(reader)
    .on('error', (error) => {
      if (argv.progress) {
        progress.cancel()
      }
      printErrorAndExit('Failed to deserialize data as JSON: ' + error ? error : 'no specific information', 65) /* EX_DATAERR */
    })
    .pipe(scanner)
    .on('error', (error) => {
      if (argv.progress) {
        progress.cancel()
      }
      printErrorAndExit('Failed to process data: ' + error ? error : 'no specific information', 65) /* EX_DATAERR */
    })
    .on('end', () => {
      if (argv.progress) {
        progress.cancel()
      }

      if (argv.results) {
        printJson(argv, {
          scanned: progress.scanned,
          valid: progress.valid,
          invalid: progress.invalid
        })
      }
    })
    .resume()
}

module.exports = declaration
