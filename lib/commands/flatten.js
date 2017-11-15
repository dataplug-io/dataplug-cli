const _ = require('lodash')
const chalk = require('chalk')
const Promise = require('bluebird')
const logger = require('winston')
const { StreamFlatter } = require('@dataplug/dataplug')
const { JsonStreamReader, JsonStreamWriter } = require('@dataplug/dataplug-json')
const Progress = require('../progress')

let declaration = {
  command: 'flatten',
  description: 'Streams data from stdin to stdout, flattening it in-between'
}
declaration.builder = (yargs) => yargs
  .option('metadata', {
    alias: 'm',
    describe: 'Include metadata in output stream',
    type: 'boolean',
    default: true
  })
  .option('name', {
    alias: 'n',
    describe: 'Name of collection to use instead of default',
    type: 'string'
  })
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
  .option('abort', {
    alias: 'a',
    describe: 'Abort on any error'
  })
declaration.prerequisites = (collection) => {
  return collection.schema
}
declaration.handler = (argv, collection) => {
  const progress = !argv.progress ? null : new Progress({
    flattened: (value) => chalk.yellow('?') + ` flattened: ${value}`
  })
  if (progress) {
    progress.flattened = 0
    progress.start()
  }

  process.on('SIGINT', function () {
    process.stdin.unpipe()
  })

  const reader = new JsonStreamReader()
  const flatter = new StreamFlatter(collection.schema, argv.name || collection.name, argv.metadata)
  const writer = new JsonStreamWriter(undefined, argv.indent ? _.repeat(' ', argv.indent) : null)

  new Promise((resolve, reject) => {
    process.stdin
      .on('error', (error) => {
        logger.log('warn', 'Error while reading data from stdin:', error)
        if (argv.abort) {
          reject(error)
        }
      })
      .pipe(reader)
      .on('error', (error) => {
        logger.log('warn', 'Error while deserializing data as JSON:', error)
        if (argv.abort) {
          reject(error)
        }
      })
      .pipe(flatter)
      .on('data', () => {
        if (progress) {
          progress.flattened += 1
        }
      })
      .on('error', (error) => {
        logger.log('warn', 'Error while flattening data:', error)
        if (argv.abort) {
          reject(error)
        }
      })
      .pipe(writer)
      .on('error', (error) => {
        logger.log('warn', 'Error while serializing data as JSON:', error)
        if (argv.abort) {
          reject(error)
        }
      })
      .pipe(process.stdout)
      .on('error', (error) => {
        logger.log('warn', 'Error while writing data to stdout:', error)
        if (argv.abort) {
          reject(error)
        }
      })
      .on('unpipe', (src) => {
        if (src === writer) {
          resolve()
        }
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
