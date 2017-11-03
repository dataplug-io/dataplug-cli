const _ = require('lodash')
const chalk = require('chalk')
const { SchemaFlatter } = require('@dataplug/dataplug')

let declaration = {
  command: 'metadata',
  description: 'Prints collection metadata to stdout'
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
declaration.prerequisites = (collection) => {
  return collection.schema
}
declaration.handler = (argv, collection) => {
  if (!collection.schema) {
    console.error(chalk.red('!'), `'${collection.name}' collection does not have a schema`)
    process.exit(70)
  }

  const metadata = new SchemaFlatter().flatten(collection.schema, argv.name || collection.name)

  const indent = argv.indent ? _.repeat(' ', argv.indent) : null
  process.stdout.write(JSON.stringify(metadata, null, indent))
}

module.exports = declaration
