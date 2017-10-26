const Builder = require('./builder')
const Progress = require('./progress')
const streamSource = require('./streamSource')
const streamTarget = require('./streamTarget')

function createBuilder () {
  return new Builder()
}

module.exports = {
  build: createBuilder,
  Builder,
  Progress,
  streamSource,
  streamTarget
}
