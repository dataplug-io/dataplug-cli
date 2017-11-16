const _ = require('lodash')
const chalk = require('chalk')
const logger = require('winston')
const { JsonStreamReader } = require('@dataplug/dataplug-json')
const Progress = require('../progress')
const configDeclarationToYargs = require('../configDeclarationToYargs')

let declaration = {
  command: 'target',
  description: `Streams data from stdin to collection`
}
declaration.builder = (yargs, collection) => {
  yargs = yargs
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

  if (collection && collection.target) {
    yargs = configDeclarationToYargs(yargs, collection.target.configDeclaration)
  }

  return yargs
}
declaration.prerequisites = (collection) => {
  return collection.target
}
declaration.handler = (argv, collection) => {
  const progress = !argv.progress ? null : new Progress({
    consumed: (value) => chalk.green('↑') + ` consumed: ${value}`
  })
  if (progress) {
    progress.start()
  }

  const reader = new JsonStreamReader()
  if (progress) {
    progress.consumed = 0
  }

  collection.target.createInput(argv)
    .then((targetStreams) => new Promise((resolve, reject) => {
      _.forEach(targetStreams, (targetStream) => {
        targetStream
          .on('error', (error) => {
            logger.log('error', 'Error while submitting data:', error)
            reject(error)
          })
      })

      _.last(targetStreams)
        .on('finish', () => {
          resolve()
        })

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
        .on('data', () => {
          if (progress) {
            progress.consumed += 1
          }
        })
        .on('unpipe', () => {
          reader.unpipe()
          if (targetStreams.length === 1) {
            targetStreams[0].end()
          }
        })
        .pipe(_.first(targetStreams))
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
