const Builder = require('./builder')
const Progress = require('./progress')

function createBuilder () {
  return new Builder()
}

module.exports = {
  build: createBuilder,
  Builder,
  Progress
}
