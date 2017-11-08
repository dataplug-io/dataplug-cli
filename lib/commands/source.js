const _ = require('lodash')
const chalk = require('chalk')
const { JsonStreamWriter } = require('@dataplug/dataplug-json')
const streamSource = require('../streamSource')
const Progress = require('../progress')
const configDeclarationToYargs = require('../configDeclarationToYargs')

let declaration = {
  command: 'source',
  description: 'Streams collection data to stdout'
}
declaration.builder = (yargs, collection) => {
  yargs = yargs
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

  if (collection && collection.source) {
    yargs = configDeclarationToYargs(yargs, collection.source.configDeclaration)
  }

  return yargs
}
declaration.prerequisites = (collection) => {
  return collection.source
}
declaration.handler = (argv, collection) => {
  const writer = new JsonStreamWriter(undefined, argv.indent ? _.repeat(' ', argv.indent) : null)
  writer.on('pipe', (source) => {
    process.on('SIGINT', function () {
      source.unpipe(writer)
      writer.end()
    })
  })

  const progress = !argv.progress ? null : new Progress({
    supplied: (value) => chalk.green('↑') + ` supplied: ${value}`
  })
  if (progress) {
    progress.start()
  }

  streamSource(collection.source, argv, process.stdout, writer, progress)
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
