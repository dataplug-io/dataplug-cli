import Builder from './builder'
import Progress from './progress'
import logger from './logger'

function createBuilder (): Builder {
  return new Builder()
}

export default {
  build: createBuilder,
  logger,
  Builder,
  Progress
}
