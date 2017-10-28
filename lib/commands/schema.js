const _ = require('lodash')
const chalk = require('chalk')

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
    console.error(chalk.red('!'), `'${collection.name}' collection does not have a schema`)
    process.exit(70)
  }

  const indent = argv.indent ? _.repeat(' ', argv.indent) : null
  process.stdout.write(JSON.stringify(collection.schema, null, indent))
}

module.exports = declaration
