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
      describe: 'Abort on any error'
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
            logger.log('warn', 'Error while submitting data:', error)
            if (argv.abort) {
              reject(error)
            }
          })
      })

      _.last(targetStreams)
        .on('finish', () => {
          resolve()
        })
        .on('unpipe', (src) => {
          resolve()
        })

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
        .on('data', () => {
          if (progress) {
            progress.consumed += 1
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
