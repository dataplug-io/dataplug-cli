import _ from 'lodash'
import chalk from 'chalk'
import logger from 'winston'
import { JsonStreamWriter } from '@dataplug/dataplug-json'
import Progress from '../progress'
import configDeclarationToYargs from '../configDeclarationToYargs'

let declaration = {
  command: 'source',
  description: 'Streams collection data to stdout',
  builder: null,
  prerequisites: null,
  handler: null
}
declaration.builder = (yargs: any, collection: any): any => {
  yargs = yargs
    .option('indent', {
      alias: 'i',
      describe: 'Prettify output JSON using given amount of spaces',
      type: 'integer'
    })
    .coerce('indent', (value: any) => {
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

  if (collection && collection.source) {
    yargs = configDeclarationToYargs(yargs, collection.source.configDeclaration)
  }

  return yargs
}
declaration.prerequisites = (collection: any) : any => {
  return collection.source
}
declaration.handler = (argv: any, collection: any): void => {
  const progress: any = !argv.progress ? null : new Progress({
    supplied: (value: any): any => chalk.green('↑') + ` supplied: ${value}`
  })
  if (progress) {
    progress.start()
  }

  const writer = new JsonStreamWriter(undefined, argv.indent ? _.repeat(' ', argv.indent) : null, argv.abort)
  if (progress) {
    progress.supplied = 0
  }

  collection.source.createOutput(argv)
    .then((sourceStreams: any): Promise<any> => new Promise((resolve, reject) => {
      sourceStreams = [].concat(sourceStreams)

      process.on('SIGINT', function () {
        _.forEach(sourceStreams, (sourceStream) => {
          if (_.isFunction(sourceStream.unpipe)) {
            sourceStream.unpipe()
          }
          sourceStream.destroy()
        })
      })

      _.forEach(sourceStreams, (sourceStream: NodeJS.ReadStream, index: number) => {
        sourceStream
          .on('error', (error: Error) => {
            logger.log('error', 'Error while obtaining data:', error)
            reject(error)
          })

        if (index > 0) {
          sourceStreams[index - 1]
            .pipe(sourceStream)
        }
      })

      (_.last(sourceStreams) as any)
        .on('data', () => {
          if (progress) {
            progress.supplied += 1
          }
        })
        .pipe(writer)
        .on('error', (error: Error) => {
          logger.log('error', 'Error while transforming data:', error)
          reject(error)
        })
        .on('unpipe', () => {
          writer.unpipe()
        })
        .pipe(process.stdout)
        .on('error', (error: Error) => {
          logger.log('error', 'Error while writing data to stdout:', error)
          reject(error)
        })
        .on('unpipe', () => {
          resolve()
        })
    }))
    .then(() => {
      if (progress) {
        progress.cancel()
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
