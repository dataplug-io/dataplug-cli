import _ from 'lodash'
import Ajv from 'ajv'
import chalk from 'chalk'
import Promise from 'bluebird'
import logger from 'winston'
import { Scanner } from '@dataplug/dataplug'
import { JsonStreamReader } from '@dataplug/dataplug-json'
import Progress from '../progress'

let declaration = {
  command: 'scan',
  description: 'Scans collection data stream from stdin and output results',
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
  .option('results', {
    alias: 'o',
    describe: 'Print the results in machine-readable format'
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
declaration.prerequisites = (collection: any): object| boolean => {
  return collection.schema
}
declaration.handler = (argv: any, collection: any): void => {
  const validator = new Ajv({
    useDefaults: true,
    allErrors: false
  }).compile(collection.schema)
  const progress: any = !argv.progress && !argv.results ? null : new Progress({
    scanned: (value: any): string => chalk.yellow('?') + ` scanned: ${value}`,
    valid: (value: any): string => chalk.green('✓') + ` valid: ${value}`,
    invalid: (value: any): string => chalk.red('✗') + ` invalid: ${value}`
  })
  if (progress) {
    progress.scanned =
      progress.valid =
      progress.invalid = 0
  }
  if (argv.progress) {
    progress.start()
  }

  const reader = new JsonStreamReader()
  const scanner = new Scanner((data: any) => {
    let result = validator(data)
    if (argv.invert) {
      result = !result
    }

    if (progress) {
      progress.scanned += 1
      if (result) {
        progress.valid += 1
      } else {
        progress.invalid += 1
      }
    }

    if (!result) {
      logger.log('warn', 'Invalid data:', validator.errors)

      if (argv.fail) {
        throw new Error('Invalid data')
      }
    }
  }, true)

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
      .pipe(scanner)
      .on('error', (error: Error) => {
        logger.log('error', 'Error while scanning data:', error)
        reject(error)
      })
      .on('end', () => {
        resolve()
      })
      .resume()
  })
    .then(() => {
      if (progress) {
        progress.cancel()
      }

      if (argv.results) {
        const space = argv.indent ? _.repeat(' ', argv.indent) : null
        const results = progress.getMetrics()
        process.stdout.write(JSON.stringify(results, null, space))
      }
    })
    .catch((error: Error) => {
      if (progress) {
        progress.cancel()
      }
      logger.log('error', chalk.red('!'), 'Aborted due to:', error)
      process.exit(70)
    })
}

export default declaration
