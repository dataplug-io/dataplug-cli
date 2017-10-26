/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const { Readable, PassThrough } = require('stream')
const { Source } = require('@dataplug/dataplug')
const { JsonStreamWriter } = require('@dataplug/dataplug-json')
const { streamSource } = require('../lib')

describe('streamSource()', () => {
  it('handles empty stream', (done) => {
    const sourceStream = new PassThrough({ objectMode: true })
    const targetStream = new PassThrough()
    streamSource(new Source({}, () => sourceStream), {}, targetStream, new JsonStreamWriter())
      .then(() => {
        return targetStream.read().toString()
      })
      .should.eventually.be.equal('[]').and.notify(done)
    sourceStream.end()
  })

  it('handles stream with single object', (done) => {
    const sourceStream = new PassThrough({ objectMode: true })
    const targetStream = new PassThrough()
    streamSource(new Source({}, () => sourceStream), {}, targetStream, new JsonStreamWriter())
      .then(() => {
        return targetStream.read().toString()
      })
      .should.eventually.be.deep.equal('[{"property":"value"}]').and.notify(done)
    sourceStream.write({property: 'value'})
    sourceStream.end()
  })

  it('handles error in source stream', (done) => {
    const sourceStream = new Readable({
      objectMode: true,
      read: function () {
        this.emit('error', 'expected')
      }
    })
    const targetStream = new PassThrough()
    streamSource(new Source({}, () => sourceStream), {}, targetStream, new JsonStreamWriter())
      .should.eventually.be.rejectedWith(/expected/).and.notify(done)
  })
})
