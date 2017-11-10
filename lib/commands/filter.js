const _ = require('lodash')
const Ajv = require('ajv')
const chalk = require('chalk')
const { Filter } = require('@dataplug/dataplug')
const { JsonStreamReader, JsonStreamWriter } = require('@dataplug/dataplug-json')
const Progress = require('../progress')

let declaration = {
  command: 'filter',
  description: 'Streams data from stdin to stdout, applying filter in-between'
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
    removeAdditional: true,
    allErrors: false
  }).compile(collection.schema)

  const progress = !argv.progress ? null : new Progress({
    filtered: (value) => chalk.yellow('?') + ` filtered: ${value}`,
    valid: (value) => chalk.green('✓') + ` valid: ${value}`,
    invalid: (value) => chalk.red('✗') + ` invalid: ${value}`
  })
  if (progress) {
    progress.start()
  }

  process.on('SIGINT', function () {
    process.stdin.unpipe()
  })

  const reader = new JsonStreamReader()
  const writer = new JsonStreamWriter(undefined, argv.indent ? _.repeat(' ', argv.indent) : null)
  const filter = new Filter((data) => {
    let result = validator(data)
    if (argv.invert) {
      result = !result
    }

    if (progress) {
      progress.filtered += 1
      if (result) {
        progress.valid += 1
      } else {
        progress.invalid += 1
      }
    }

    if (!result && argv.fail) {
      throw new Error(JSON.stringify(validator.errors))
    }

    return result
  })

  if (progress) {
    progress.filtered = 0
    progress.valid = 0
    progress.invalid = 0
  }

  new Promise((resolve, reject) => {
    process.stdin
      .on('error', (error) => {
        reject('Failed to read data form stdin: ' + error ? error : 'no specific information')
      })
      .pipe(reader)
      .on('error', (error) => {
        reject('Failed to deserialize data as JSON: ' + error ? error : 'no specific information')
      })
      .pipe(filter)
      .on('error', (error) => {
        reject('Failed to validate data: ' + error ? error : 'no specific information')
      })
      .pipe(writer)
      .on('error', (error) => {
        reject('Failed to serialize data as JSON: ' + error ? error : 'no specific information')
      })
      .pipe(process.stdout)
      .on('error', (error) => {
        reject('Failed to write data to stdout: ' + error ? error : 'no specific information')
      })
      .on('finish', () => {
        resolve()
      })
  })
    .then(() => {
      if (progress) {
        progress.cancel()
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
