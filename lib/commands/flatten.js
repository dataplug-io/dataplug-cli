const _ = require('lodash')
const chalk = require('chalk')
const Promise = require('bluebird')
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
declaration.prerequisites = (collection) => {
  return collection.schema
}
declaration.handler = (argv, collection) => {
  if (!collection.schema) {
    console.error(chalk.red('!'), `'${collection.name}' collection does not have a schema`)
    process.exit(70)
  }

  const progress = !argv.progress ? null : new Progress({
    flattened: (value) => chalk.yellow('?') + ` flattened: ${value}`
  })
  if (progress) {
    progress.flattened = 0
    progress.start()
  }

  const reader = new JsonStreamReader()
  const flatter = new StreamFlatter(collection.schema, argv.name || collection.name, argv.metadata)
  const writer = new JsonStreamWriter(undefined, argv.indent ? _.repeat(' ', argv.indent) : null)
  writer.on('pipe', (source) => {
    process.on('SIGINT', function () {
      source.unpipe(writer)
      writer.end()
    })
  })

  new Promise((resolve, reject) => {
    process.stdin
      .pipe(reader)
      .on('error', (error) => {
        reject('Failed to deserialize data as JSON: ' + error ? error : 'no specific information')
      })
      .pipe(flatter)
      .on('data', () => {
        if (progress) {
          progress.flattened += 1
        }
      })
      .on('error', (error) => {
        reject('Failed to flatten data: ' + error ? error : 'no specific information')
      })
      .pipe(writer)
      .on('error', (error) => {
        reject('Failed to serialize data as JSON: ' + error ? error : 'no specific information')
      })
      .pipe(process.stdout)
      .on('finish', () => {
        resolve()
      })
  })
  .then(() => {
    if (progress) {
      progress.cancel()
    }
    process.exit()
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
