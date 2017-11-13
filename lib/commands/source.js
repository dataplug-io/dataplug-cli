const _ = require('lodash')
const chalk = require('chalk')
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

  const writer = new JsonStreamWriter(undefined, argv.indent ? _.repeat(' ', argv.indent) : null)
  if (progress) {
    progress.supplied = 0
  }

  collection.source.createOutput(argv)
    .then((sourceStreams) => new Promise((resolve, reject) => {
      sourceStreams = [].concat(sourceStreams)

      process.on('SIGINT', function () {
        _.first(sourceStreams).destroy()
      })

      writer
        .on('error', (error) => {
          reject('Failed to transform data: ' + error ? error : 'no specific information')
        })

      _.forEach(sourceStreams, (sourceStream) => {
        sourceStream
          .on('error', (error) => {
            reject('Failed to obtain data from source: ' + error ? error : 'no specific information')
          })
      })
      _.last(sourceStreams)
        .on('data', () => {
          if (progress) {
            progress.supplied += 1
          }
        })

      process.stdout
        .on('error', (error) => {
          reject('Failed to submit data to target: ' + error ? error : 'no specific information')
        })
        .on('finish', () => {
          resolve()
        })

      _.last(sourceStreams)
        .pipe(writer)
        .pipe(process.stdout)
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
      console.error(chalk.red('!'), error || 'Unknown error')
      process.exit(70)
    })
}

module.exports = declaration
