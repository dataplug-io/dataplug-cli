/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const { Readable, Writable, PassThrough } = require('stream')
const { Target } = require('@dataplug/dataplug')
const { JsonStreamReader } = require('@dataplug/dataplug-json')
const { streamTarget } = require('../lib')

describe('streamTarget()', () => {
  it('handles empty stream', (done) => {
    const sourceStream = new PassThrough()
    const targetStream = new PassThrough({ objectMode: true })
    streamTarget(new Target({}, () => targetStream), {}, sourceStream, new JsonStreamReader())
      .then(() => {
        return targetStream.read()
      })
      .should.eventually.be.null.and.notify(done)
    sourceStream.end()
  })

  it('handles stream with empty array', (done) => {
    const sourceStream = new PassThrough()
    const targetStream = new PassThrough({ objectMode: true })
    streamTarget(new Target({}, () => targetStream), {}, sourceStream, new JsonStreamReader())
      .then(() => {
        return targetStream.read()
      })
      .should.eventually.be.null.and.notify(done)
    sourceStream.write('[]')
    sourceStream.end()
  })

  it('handles stream with single-element array', (done) => {
    const sourceStream = new PassThrough()
    const targetStream = new PassThrough({ objectMode: true })
    streamTarget(new Target({}, () => targetStream), {}, sourceStream, new JsonStreamReader())
      .then(() => {
        return targetStream.read()
      })
      .should.eventually.be.deep.equal({property: 'value'}).and.notify(done)
    sourceStream.write('[{"property":"value"}]')
    sourceStream.end()
  })

  it('handles error in source stream', (done) => {
    const sourceStream = new Readable({
      read: function () {
        this.emit('error', 'expected')
      }
    })
    const targetStream = new Writable({ objectMode: true })
    streamTarget(new Target({}, () => targetStream), {}, sourceStream, new JsonStreamReader())
      .should.eventually.be.rejectedWith(/expected/).and.notify(done)
  })

  it('handles error in target stream', (done) => {
    const sourceStream = new PassThrough()
    const targetStream = new Writable({
      objectMode: true,
      write: function () {
        this.emit('error', 'expected')
      }
    })
    streamTarget(new Target({}, () => targetStream), {}, sourceStream, new JsonStreamReader())
      .should.eventually.be.rejectedWith(/expected/).and.notify(done)
    sourceStream.write('[{"property":"value"}]')
    sourceStream.end()
  })
})
