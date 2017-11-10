const _ = require('lodash')
const Promise = require('bluebird')

/**
 * Creates output of given source and streams it to specified Writable stream, optionally altering the data
 * using specified Transform
 *
 * @param {Source} source Output source
 * @param {} params Output source params
 * @param {Writable} targetStream Stream to write data to
 * @param {Transform} [transform=undefined] Transform to apply to the data
 * @param {Progress} [progress=undefined] Progress counter
 */
async function streamSource (source, params, targetStream, transform = undefined, progress = undefined) {
  const sourceStreams = [].concat(await source.createOutput(params))

  if (progress) {
    progress.supplied = 0
  }

  return new Promise((resolve, reject) => {
    if (transform) {
      transform
        .on('error', (error) => {
          reject('Failed to transform data: ' + error ? error : 'no specific information')
        })
    }

    _.forEach(sourceStreams, (sourceStream) => {
      sourceStream
        .on('error', (error) => {
          reject('Failed to obtain data from source: ' + error ? error : 'no specific information')
        })
    })
    _.last(sourceStreams)
      .on('data', () => {
        if (progress) {
          progress.supplied += 1
        }
      })

    targetStream
      .on('error', (error) => {
        reject('Failed to submit data to target: ' + error ? error : 'no specific information')
      })
      .on('finish', () => {
        resolve()
      })

    let chain = _.last(sourceStreams)
    if (transform) {
      chain
        .pipe(transform)
      chain = transform
    }
    chain = chain
      .pipe(targetStream)
  })
}

module.exports = streamSource
