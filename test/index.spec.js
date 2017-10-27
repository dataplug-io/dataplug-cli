/* eslint-env node, mocha */
require('chai')
  .should()
const dataplugCli = require('../lib')

describe('dataplug-cli', () => {
  it('has "build" function', () => {
    dataplugCli
      .should.have.property('build')
      .that.is.an('function')
  })

  describe('#build()', () => {
    it('creates an instance of Builder', () => {
      dataplugCli.build()
        .should.be.an.instanceof(dataplugCli.Builder)
    })
  })

  it('has "Builder" class', () => {
    dataplugCli
      .should.have.property('Builder')
      .that.is.an('function')
  })

  it('has "Progress" class', () => {
    dataplugCli
      .should.have.property('Progress')
      .that.is.an('function')
  })

  it('has "filterStream" function', () => {
    dataplugCli
      .should.have.property('filterStream')
      .that.is.an('function')
  })

  it('has "streamSource" function', () => {
    dataplugCli
      .should.have.property('streamSource')
      .that.is.an('function')
  })

  it('has "streamTarget" function', () => {
    dataplugCli
      .should.have.property('streamTarget')
      .that.is.an('function')
  })
})
