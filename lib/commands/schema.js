const _ = require('lodash')
const {
  printJson,
  printErrorAndExit
} = require('../command')

let declaration = {
  command: 'schema',
  description: 'Prints collection schema to stdout'
}
declaration.builder = (yargs) => yargs
  .option('indent', {
    alias: 'i',
    describe: 'Prettify output JSON using given amount of spaces',
    type: 'integer'
  })
  .coerce('indent', value => {
    value = Number.parseInt(value)
    return _.isNaN(value) ? undefined : value
  })
declaration.prerequisites = (collection) => {
  return collection.schema
}
declaration.handler = (argv, collection) => {
  if (!collection.schema) {
    printErrorAndExit(`'${collection.name}' collection does not have a schema`)
    return
  }

  printJson(argv, collection.schema)
}

module.exports = declaration
