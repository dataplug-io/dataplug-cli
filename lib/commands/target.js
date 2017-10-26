const chalk = require('chalk')
const { JsonStreamReader } = require('@dataplug/dataplug-json')
const { printErrorAndExit } = require('../command')
const streamTarget = require('../streamTarget')
const Progress = require('../progress')
const helpers = require('../helpers')

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
    yargs = helpers.configDeclarationToYargs(yargs, collection.target.configDeclaration)
  }

  return yargs
}
declaration.prerequisites = (collection) => {
  return collection.target
}
declaration.handler = (argv, collection) => {
  if (!collection.target) {
    printErrorAndExit(`'${collection.name}' collection does not have a target`)
    return
  }

  const reader = new JsonStreamReader()

  const progress = new Progress({
    consumed: (value) => chalk.green('↑') + ` consumed: ${value}`
  })
  progress.consumed = 0
  if (argv.progress) {
    progress.start()
  }

  streamTarget(collection.target, argv, process.stdin, reader)
    .then(() => {
      if (argv.progress) {
        progress.cancel()
      }
      process.exit()
    })
    .catch((error) => {
      if (argv.progress) {
        progress.cancel()
      }
      printErrorAndExit(error || 'Unknown error')
    })
}

module.exports = declaration
