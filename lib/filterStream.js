/**
 * Filters source stream using specified filter, optionally applying source transform, and directs filtered data
 * to targetStream, optionally applying target transform
 *
 * @param {Readable} sourceStream Source stream
 * @param {Transform} filter Filter
 * @param {Writable} targetStream Target stream
 * @param {Transform} [sourceTransform=undefined] Source transform
 * @param {Transform} [targetTransform=undefined] Target transform
 */
async function filterStream (sourceStream, filter, targetStream, sourceTransform = undefined, targetTransform = undefined) {
  return new Promise((resolve, reject) => {
    let lastChainedStream = sourceStream

    if (sourceTransform) {
      lastChainedStream
        .pipe(sourceTransform)
        .on('error', (error) => {
          reject('Failed to deserialize data as JSON: ' + error ? error : 'no specific information')
        })
      lastChainedStream = sourceTransform
    }

    lastChainedStream
      .pipe(filter)
      .on('error', (error) => {
        reject('Failed to validate data: ' + error ? error : 'no specific information')
      })
    lastChainedStream = filter

    if (targetTransform) {
      lastChainedStream
        .pipe(targetTransform)
        .on('error', (error) => {
          reject('Failed to serialize data as JSON: ' + error ? error : 'no specific information')
        })
      lastChainedStream = targetTransform
    }

    targetStream
      .on('finish', () => {
        resolve()
      })

    lastChainedStream
      .pipe(targetStream)
  })
}

module.exports = filterStream
