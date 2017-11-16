const _ = require('lodash')
const chalk = require('chalk')
const logger = require('winston')
const { JsonStreamWriter } = require('@dataplug/dataplug-json')
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
    .option('abort', {
      alias: 'a',
      describe: 'Abort on any error',
      type: 'boolean',
      default: false
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
  const progress = !argv.progress ? null : new Progress({
    supplied: (value) => chalk.green('↑') + ` supplied: ${value}`
  })
  if (progress) {
    progress.start()
  }

  const writer = new JsonStreamWriter(undefined, argv.indent ? _.repeat(' ', argv.indent) : null, argv.abort)
  if (progress) {
    progress.supplied = 0
  }

  collection.source.createOutput(argv)
    .then((sourceStreams) => new Promise((resolve, reject) => {
      sourceStreams = [].concat(sourceStreams)

      process.on('SIGINT', function () {
        _.first(sourceStreams).destroy()
      })

      _.forEach(sourceStreams, (sourceStream) => {
        sourceStream
          .on('error', (error) => {
            logger.log('error', 'Error while obtaining data:', error)
            reject(error)
          })
          .on('unpipe', () => {
            sourceStream.unpipe()
          })
      })

      _.last(sourceStreams)
        .on('data', () => {
          if (progress) {
            progress.supplied += 1
          }
        })
        .pipe(writer)
        .on('error', (error) => {
          logger.log('error', 'Error while transforming data:', error)
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
    }))
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
