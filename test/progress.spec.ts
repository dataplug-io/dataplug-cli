/* eslint-env node, mocha */
import 'ts-jest'
import { PassThrough } from 'stream'
import Progress from '../lib/progress'

describe('Progress', () => {
  describe('#print()', () => {
    it('writes boolean metric value', () => {
      const stream = new PassThrough()
      const progress: any = new Progress(undefined, stream)
      progress.metric = false
      progress.print()
      const result = stream.read().toString();
      expect(result).toEqual('\u001b[2Kmetric = false\n')
    })

    it('writes integer metric value', () => {
      const stream = new PassThrough()
      const progress: any = new Progress(undefined, stream)
      progress.metric = 42
      progress.print()
      const result = stream.read().toString()
      expect(result).toBe('\u001b[2Kmetric = 42\n')
    })

    it('writes float metric value', () => {
      const stream = new PassThrough()
      const progress: any = new Progress(undefined, stream)
      progress.metric = 4.2
      progress.print()
      const result = stream.read().toString()
      expect(result).toBe('\u001b[2Kmetric = 4.2\n')
    })

    it('writes string metric value', () => {
      const stream = new PassThrough()
      const progress: any = new Progress(undefined, stream)
      progress.metric = '42!'
      progress.print()
      const result = stream.read().toString()
      expect(result).toBe('\u001b[2Kmetric = 42!\n')
    })

    it('writes metric with undefined value as 0', () => {
      const stream = new PassThrough()
      const progress: any = new Progress(undefined, stream)
      progress.metric = undefined
      progress.print()
      const result = stream.read().toString()
      expect(result).toBe('\u001b[2Kmetric = 0\n')
    })

    it('writes metric with null value as 0', () => {
      const stream = new PassThrough()
      const progress: any = new Progress(undefined, stream)
      progress.metric = null
      progress.print()
      const result = stream.read().toString()
      expect(result).toEqual('\u001b[2Kmetric = 0\n')
    })
  })

  describe('#getMetrics()', () => {
    it('returns metrics', () => {
      const progress: any = new Progress()
      progress.metric = 0
      expect(progress.getMetrics()).toHaveProperty('metric', 0)
    })
  })
})
