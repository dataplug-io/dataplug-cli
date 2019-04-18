import _ from 'lodash'
import chalk from 'chalk'
import logger from 'winston'
import { JsonStreamReader } from '@dataplug/dataplug-json'
import Progress from '../progress';
import configDeclarationToYargs from '../configDeclarationToYargs'

let declaration = {
  command: 'target',
  description: `Streams data from stdin to collection`,
  builder: null,
  prerequisites: null,
  handler: null
}
declaration.builder = (yargs: any, collection: any): any => {
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
declaration.prerequisites = (collection: any): any => {
  return collection.target
}
declaration.handler = (argv: any, collection: any): void => {
  const progress: any = !argv.progress ? null : new Progress({
    consumed: (value: any): any => chalk.green('↑') + ` consumed: ${value}`
  })
  if (progress) {
    progress.start()
  }

  const reader = new JsonStreamReader()
  if (progress) {
    progress.consumed = 0
  }

  collection.target.createInput(argv)
    .then((targetStreams: any): Promise<any> => new Promise((resolve: any, reject: any) => {
      _.forEach(targetStreams, (targetStream: NodeJS.ReadStream, index: number) => {
        targetStream
          .on('error', (error: Error) => {
            logger.log('error', 'Error while submitting data:', error)
            reject(error)
          })

        if (index > 0) {
          targetStreams[index - 1]
            .pipe(targetStreams)
        }
      })

      (_.last(targetStreams) as any)
        .on('close', () => {
          resolve()
        })

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
    .catch((error: Error) => {
      if (progress) {
        progress.cancel()
      }
      logger.log('error', chalk.red('!'), 'Aborted due to:', error)
      process.exit(70)
    })
}

export default declaration
