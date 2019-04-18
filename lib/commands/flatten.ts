import _ from 'lodash'
import chalk from 'chalk'
import Promise from 'bluebird'
import logger from 'winston'
import { StreamFlatter } from '@dataplug/dataplug-flatters'
import { JsonStreamReader, JsonStreamWriter } from '@dataplug/dataplug-json'
import Progress from '../progress'

let declaration = {
  command: 'flatten',
  description: 'Streams data from stdin to stdout, flattening it in-between',
  builder: null,
  prerequisites: null,
  handler: null
}
declaration.builder = (yargs: any): any => yargs
  .option('metadata', {
    alias: 'm',
    describe: 'Include metadata in output stream',
    type: 'boolean',
    default: true
  })
  .option('name', {
    alias: 'n',
    describe: 'Name of collection to use instead of default',
    type: 'string'
  })
  .option('indent', {
    alias: 'i',
    describe: 'Prettify output JSON using given amount of spaces',
    type: 'integer'
  })
  .coerce('indent', (value: any): any => {
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
declaration.prerequisites = (collection: any): any => {
  return collection.schema
}
declaration.handler = (argv: any, collection: any): void => {
  const progress: any = !argv.progress ? null : new Progress({
    flattened: (value: any) => chalk.yellow('?') + ` flattened: ${value}`
  })
  if (progress) {
    progress.flattened = 0
    progress.start()
  }

  const reader = new JsonStreamReader()
  const flatter = new StreamFlatter(collection.schema, argv.name || collection.name, argv.metadata, undefined, argv.abort)
  const writer = new JsonStreamWriter(undefined, argv.indent ? _.repeat(' ', argv.indent) : null, argv.abort)

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
      .pipe(flatter)
      .on('data', () => {
        if (progress) {
          progress.flattened += 1
        }
      })
      .on('error', (error: Error) => {
        logger.log('error', 'Error while flattening data:', error)
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
