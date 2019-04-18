/* eslint-env node, mocha */
import 'ts-jest'
import dataplugCli from '../lib'

describe('dataplug-cli', () => {
  it('has "build" function', () => {
    expect(dataplugCli).toHaveProperty('build')
    expect(typeof dataplugCli.build).toBe('function')
  })

  describe('#build()', () => {
    it('creates an instance of Builder', () => {
      expect(dataplugCli.build()).toBeInstanceOf(dataplugCli.Builder)
    })
  })

  it('has "logger" field', () => {
    expect(dataplugCli).toHaveProperty('logger')
    expect(typeof dataplugCli.logger).toBe('object')
  })

  it('has "Builder" class', () => {
    expect(dataplugCli).toHaveProperty('Builder')
    expect(typeof dataplugCli.Builder).toBe('function')
  })

  it('has "Progress" class', () => {
    expect(dataplugCli).toHaveProperty('Progress')
    expect(typeof dataplugCli.Progress).toBe('function')
  })
})
