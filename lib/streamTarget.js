const Promise = require('bluebird')

/**
 * Creates input of given target and streams sourceStream to it, optionally altering the data
 * using specified Transform
 *
 * @param {Target} target Input target
 * @param {} params Input target params
 * @param {Readable} sourceStream Stream to read data from
 * @param {Transform} [transform=undefined] Transform to apply to the data
 * @param {Progress} [progress=undefined] Progress counter
 */
async function streamTarget (target, params, sourceStream, transform = undefined, progress = undefined) {
  const targetStream = await target.createInput(params)

  if (progress) {
    progress.consumed = 0
  }

  return new Promise((resolve, reject) => {
    if (transform) {
      transform
        .on('data', () => {
          if (progress) {
            progress.consumed += 1
          }
        })
        .on('error', (error) => {
          reject('Failed to transform data: ' + error ? error : 'no specific information')
        })
    }

    sourceStream
      .on('error', (error) => {
        reject('Failed to obtain data from source: ' + error ? error : 'no specific information')
      })
      .on('end', () => {
        resolve()
      })

    targetStream
      .on('error', (error) => {
        reject('Failed to submit data to target: ' + error ? error : 'no specific information')
      })

    if (!transform) {
      sourceStream
        .on('data', () => {
          if (progress) {
            progress.consumed += 1
          }
        })
    }

    sourceStream
      .pipe(transform)
      .pipe(targetStream)
  })
}

module.exports = streamTarget
