const _ = require('lodash')
const { SchemaFlatter } = require('@dataplug/dataplug-flatters')

let declaration = {
  command: 'schema',
  description: 'Prints collection schema to stdout'
}
declaration.builder = (yargs) => yargs
  .option('name', {
    alias: 'n',
    describe: 'Name of collection to use instead of default',
    type: 'string'
  })
  .option('indent', {
    alias: 'i',
    describe: 'Prettify output JSON using given amount of spaces',
    type: 'integer'
  })
  .coerce('indent', value => {
    value = Number.parseInt(value)
    return _.isNaN(value) ? undefined : value
  })
  .option('flat', {
    describe: 'Flatten schema'
  })
declaration.prerequisites = (collection) => {
  return collection.schema
}
declaration.handler = (argv, collection) => {
  let schema = collection.schema
  if (argv.flat) {
    schema = new SchemaFlatter().flattenToJsonSchema(schema, argv.name || collection.name)
  }

  const indent = argv.indent ? _.repeat(' ', argv.indent) : null
  process.stdout.write(JSON.stringify(schema, null, indent))
}

module.exports = declaration
