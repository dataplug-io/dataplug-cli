const _ = require('lodash')
const Ajv = require('ajv')
const chalk = require('chalk')
const { Filter } = require('@dataplug/dataplug')
const { JsonStreamReader, JsonStreamWriter } = require('@dataplug/dataplug-json')
const { printErrorAndExit } = require('../command')
const Progress = require('../progress')

let declaration = {
  command: 'filter',
  description: 'Streams data from stdin to stdout, applying filter in-between'
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
  .option('invert', {
    alias: 'r',
    describe: 'Invert valid and invalid meaning',
    type: 'boolean',
    default: false
  })
  .option('fail', {
    alias: 'f',
    describe: 'Fail on invalid data with failure'
  })
declaration.prerequisites = (collection) => {
  return collection.schema
}
declaration.handler = (argv, collection) => {
  if (!collection.schema) {
    printErrorAndExit(`'${collection.name}' collection does not have a schema`)
    return
  }

  const validator = new Ajv({
    allErrors: false
  })
    .compile(collection.schema)
  const progress = new Progress({
    filtered: (value) => chalk.yellow('?') + ` filtered: ${value}`,
    valid: (value) => chalk.green('✓') + ` valid: ${value}`,
    invalid: (value) => chalk.red('✗') + ` invalid: ${value}`
  })
  progress.filtered =
    progress.valid =
    progress.invalid = 0
  if (argv.progress) {
    progress.start()
  }

  process.stdin
    .pipe(new JsonStreamReader())
    .on('error', (error) => {
      if (argv.progress) {
        progress.cancel()
      }
      printErrorAndExit('Failed to deserialize data as JSON: ' + error ? error : 'no specific information', 65) /* EX_DATAERR */
    })
    .pipe(new Filter((data) => {
      let result = validator(data)
      if (argv.invert) {
        result = !result
      }

      progress.filtered += 1
      if (result) {
        progress.valid += 1
      } else {
        progress.invalid += 1
      }

      if (!result && argv.fail) {
        throw new Error(JSON.stringify(validator.errors))
      }

      return result
    }))
    .on('error', (error) => {
      if (argv.progress) {
        progress.cancel()
      }
      printErrorAndExit('Failed to validate data: ' + error ? error : 'no specific information', 65) /* EX_DATAERR */
    })
    .pipe(new JsonStreamWriter(undefined, argv.indent ? _.repeat(' ', parseInt(argv.indent)) : null))
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
