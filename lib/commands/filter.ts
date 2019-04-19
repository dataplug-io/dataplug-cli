import _ from 'lodash'
import Ajv from 'ajv'
import chalk from 'chalk'
import logger from 'winston'
import { Filter } from '@dataplug/dataplug'
import { JsonStreamReader, JsonStreamWriter } from '@dataplug/dataplug-json'
import Progress from '../progress'

let declaration = {
  command: 'filter',
  description: 'Streams data from stdin to stdout, applying filter in-between',
  builder: null,
  prerequisites: null,
  handler: null
}

declaration.builder = (yargs: any): any => yargs
  .option('indent', {
    alias: 'i',
    describe: 'Prettify output JSON using given amount of spaces',
    type: 'integer'
  })
  .coerce('indent', (value: string): number | undefined => {
    const parsedValue = Number.parseInt(value)
    return _.isNaN(parsedValue) ? undefined : parsedValue
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
    describe: 'Fail on invalid data with non-zero exit code'
  })
  .option('abort', {
    alias: 'a',
    describe: 'Abort on any error',
    type: 'boolean',
    default: false
  })
declaration.prerequisites = (collection: any): object| boolean => {
  return collection.schema
}
declaration.handler = (argv: any, collection: any): void => {
  const validator = new Ajv({
    useDefaults: true,
    removeAdditional: true,
    allErrors: false
  }).compile(collection.schema)

  const progress: any = !argv.progress ? null : new Progress({
    filtered: (value: any): string => chalk.yellow('?') + ` filtered: ${value}`,
    valid: (value: any): string => chalk.green('✓') + ` valid: ${value}`,
    invalid: (value: any): string => chalk.red('✗') + ` invalid: ${value}`
  })
  if (progress) {
    progress.start()
  }

  process.on('SIGINT', () => process.stdin.unpipe())

  const reader = new JsonStreamReader()
  const writer = new JsonStreamWriter(undefined, argv.indent ? _.repeat(' ', argv.indent) : null, argv.abort)
  const filter = new Filter((data: any) => {
    let result = validator(data)
    if (argv.invert) {
      result = !result
    }

    if (progress) {
      progress.filtered += 1
      if (result) {
        progress.valid += 1
      } else {
        progress.invalid += 1
      }
    }

    if (!result) {
      logger.log('warn', 'Invalid data:', validator.errors)

      if (argv.fail) {
        argv.abort = true
        throw new Error('Invalid data')
      }
    }

    return result
  }, argv.abort)

  if (progress) {
    progress.filtered = 0
    progress.valid = 0
    progress.invalid = 0
  }

  new Promise((resolve: any, reject: any) => {
    process.stdin
      .on('error', (error: Error) => {
        logger.log('error', 'Error while reading data from stdin:', error)
        reject(error)
      })
      .pipe(reader)
      .on('error', (error: Error) => {
        logger.log('error', 'Error while deserializing data as JSON:', error)
        reject(error)
      })
      .pipe(filter)
      .on('error', (error: Error) => {
        logger.log('error', 'Error while filtering data:', error)
        reject(error)
      })
      .pipe(writer)
      .on('error', (error: Error) => {
        logger.log('error', 'Error while serializing data as JSON:', error)
        reject(error)
      })
      .pipe(process.stdout)
      .on('error', (error: Error) => {
        logger.log('error', 'Error while writing data to stdout:', error)
        reject(error)
      })
      .on('unpipe', () => {
        resolve()
      })
  })
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

export default declaration
