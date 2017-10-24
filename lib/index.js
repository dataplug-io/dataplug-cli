const Builder = require('./builder')

function createBuilder () {
  return new Builder()
}

module.exports = {
  build: createBuilder,
  Builder
}
