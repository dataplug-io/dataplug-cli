/* eslint-env node, mocha */
require('chai')
  .should()
const { PassThrough } = require('stream')
const { Progress } = require('../lib')

describe('Progress', () => {
  describe('#print()', () => {
    it('writes boolean metric value', () => {
      const stream = new PassThrough()
      const progress = new Progress(undefined, stream)
      progress.metric = false
      progress.print()
      stream.read().toString()
        .should.be.equal('\u001b[2Kmetric = false\n')
    })

    it('writes integer metric value', () => {
      const stream = new PassThrough()
      const progress = new Progress(undefined, stream)
      progress.metric = 42
      progress.print()
      stream.read().toString()
        .should.be.equal('\u001b[2Kmetric = 42\n')
    })

    it('writes float metric value', () => {
      const stream = new PassThrough()
      const progress = new Progress(undefined, stream)
      progress.metric = 4.2
      progress.print()
      stream.read().toString()
        .should.be.equal('\u001b[2Kmetric = 4.2\n')
    })

    it('writes string metric value', () => {
      const stream = new PassThrough()
      const progress = new Progress(undefined, stream)
      progress.metric = '42!'
      progress.print()
      stream.read().toString()
        .should.be.equal('\u001b[2Kmetric = 42!\n')
    })

    it('writes metric with undefined value as 0', () => {
      const stream = new PassThrough()
      const progress = new Progress(undefined, stream)
      progress.metric = undefined
      progress.print()
      stream.read().toString()
        .should.be.equal('\u001b[2Kmetric = 0\n')
    })

    it('writes metric with null value as 0', () => {
      const stream = new PassThrough()
      const progress = new Progress(undefined, stream)
      progress.metric = null
      progress.print()
      stream.read().toString()
        .should.be.equal('\u001b[2Kmetric = 0\n')
    })
  })
})
