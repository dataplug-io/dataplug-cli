const _ = require('lodash')
const chalk = require('chalk')
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
            reject('Failed to submit data to target: ' + error ? error : 'no specific information')
          })
      })

      _.last(targetStreams)
        .on('finish', () => {
          resolve()
        })

      process.stdin
        .on('error', (error) => {
          reject('Failed to obtain data from source: ' + error ? error : 'no specific information')
        })
        .pipe(reader)
        .on('data', () => {
          if (progress) {
            progress.consumed += 1
          }
        })
        .on('error', (error) => {
          reject('Failed to transform data: ' + error ? error : 'no specific information')
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
      console.error(chalk.red('!'), error || 'Unknown error')
      process.exit(70)
    })
}

module.exports = declaration
