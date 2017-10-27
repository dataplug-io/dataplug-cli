const _ = require('lodash')
const chalk = require('chalk')
const { Flatter } = require('@dataplug/dataplug')
const { JsonStreamReader, JsonStreamWriter } = require('@dataplug/dataplug-json')
const { printErrorAndExit } = require('../command')
const Progress = require('../progress')

let declaration = {
  command: 'flatten',
  description: 'Streams data from stdin to stdout, flattening it in-between'
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
declaration.prerequisites = (collection) => {
  return collection.schema
}
declaration.handler = (argv, collection) => {
  if (!collection.schema) {
    printErrorAndExit(`'${collection.name}' collection does not have a schema`)
    return
  }

  const progress = new Progress({
    flattened: (value) => chalk.yellow('?') + ` flattened: ${value}`
  })
  progress.flattened = 0
  if (argv.progress) {
    progress.start()
  }

  const reader = new JsonStreamReader()
  const flatter = new Flatter(collection.schema)
  const writer = new JsonStreamWriter(undefined, argv.indent ? _.repeat(' ', argv.indent) : null)
  writer.on('pipe', (source) => {
    process.on('SIGINT', function () {
      source.unpipe(writer)
      writer.end()
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
    .pipe(flatter)
    .on('data', () => {
      progress.flattened += 1
    })
    .on('error', (error) => {
      if (argv.progress) {
        progress.cancel()
      }
      printErrorAndExit('Failed to flatten data: ' + error ? error : 'no specific information', 65) /* EX_DATAERR */
    })
    .pipe(writer)
    .on('error', (error) => {
      if (argv.progress) {
        progress.cancel()
      }
      printErrorAndExit('Failed to serialize data as JSON: ' + error ? error : 'no specific information', 65) /* EX_DATAERR */
    })
    .on('end', () => {
      if (argv.progress) {
        progress.cancel()
      }
    })
    .pipe(process.stdout)
}

module.exports = declaration
