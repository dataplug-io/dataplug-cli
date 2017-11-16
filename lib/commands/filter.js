const _ = require('lodash')
const Ajv = require('ajv')
const chalk = require('chalk')
const logger = require('winston')
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
    describe: 'Fail on invalid data with non-zero exit code'
  })
  .option('abort', {
    alias: 'a',
    describe: 'Abort on any error',
    type: 'boolean',
    default: false
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
  const writer = new JsonStreamWriter(undefined, argv.indent ? _.repeat(' ', argv.indent) : null, argv.abort)
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

    if (!result) {
      logger.log('warn', 'Invalid data:', validator.errors)

      if (argv.fail) {
        argv.abort = true
        throw new Error('Invalid data')
      }
    }

    return result
  }, argv.abort)

  if (progress) {
    progress.filtered = 0
    progress.valid = 0
    progress.invalid = 0
  }

  new Promise((resolve, reject) => {
    process.stdin
      .on('error', (error) => {
        logger.log('error', 'Error while reading data from stdin:', error)
        reject(error)
      })
      .pipe(reader)
      .on('error', (error) => {
        logger.log('error', 'Error while deserializing data as JSON:', error)
        reject(error)
      })
      .on('unpipe', () => {
        reader.unpipe()
      })
      .pipe(filter)
      .on('error', (error) => {
        logger.log('error', 'Error while filtering data:', error)
        reject(error)
      })
      .on('unpipe', () => {
        filter.unpipe()
      })
      .pipe(writer)
      .on('error', (error) => {
        logger.log('error', 'Error while serializing data as JSON:', error)
        reject(error)
      })
      .on('unpipe', () => {
        writer.unpipe()
      })
      .pipe(process.stdout)
      .on('error', (error) => {
        logger.log('error', 'Error while writing data to stdout:', error)
        reject(error)
      })
      .on('unpipe', () => {
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
      logger.log('error', chalk.red('!'), 'Aborted due to:', error)
      process.exit(70)
    })
}

module.exports = declaration
