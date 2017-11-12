const Builder = require('./builder')
const Progress = require('./progress')
const logger = require('./logger')

function createBuilder () {
  return new Builder()
}

module.exports = {
  build: createBuilder,
  logger,
  Builder,
  Progress
}
