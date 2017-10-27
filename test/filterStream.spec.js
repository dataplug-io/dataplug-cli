/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const { PassThrough } = require('stream')
const { Filter } = require('@dataplug/dataplug')
const { JsonStreamReader, JsonStreamWriter } = require('@dataplug/dataplug-json')
const { filterStream } = require('../lib')

describe('filterStream()', () => {
  it('handles empty stream', (done) => {
    const sourceStream = new PassThrough()
    const filter = new Filter(() => true)
    const targetStream = new PassThrough()
    const sourceTransform = new JsonStreamReader()
    const targetTransform = new JsonStreamWriter()
    filterStream(sourceStream, filter, targetStream, sourceTransform, targetTransform)
      .then(() => {
        return targetStream.read().toString()
      })
      .should.eventually.be.equal('[]').and.notify(done)
    sourceStream.end()
  })
})
