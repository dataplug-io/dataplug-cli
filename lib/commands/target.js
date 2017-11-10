const chalk = require('chalk')
const { JsonStreamReader } = require('@dataplug/dataplug-json')
const streamTarget = require('../streamTarget')
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
  const reader = new JsonStreamReader()

  const progress = !argv.progress ? null : new Progress({
    consumed: (value) => chalk.green('↑') + ` consumed: ${value}`
  })
  if (progress) {
    progress.start()
  }

  streamTarget(collection.target, argv, process.stdin, reader, progress)
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
