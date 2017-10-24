/* eslint-env node, mocha */
require('chai')
  .should()
const dataplugCli = require('../lib')

describe('dataplug-cli', () => {
  it('should have a "build" function', () => {
    dataplugCli
      .should.have.property('build')
      .that.is.an('function')
  })

  it('should have "Builder" class', () => {
    dataplugCli
      .should.have.property('Builder')
      .that.is.an('function')
  })

  describe('#build()', () => {
    it('should create an instance of Builder', () => {
      dataplugCli.build()
        .should.be.an.instanceof(dataplugCli.Builder)
    })
  })
})
